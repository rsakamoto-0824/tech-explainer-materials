# gam_data.R — 動画の図に使う数値を、R の mgcv で計算する。最後の値は JSON の文字列。
# ふつうは node tools/make-data.mjs から webR（Node 上で動く R）で実行する。
# R が入っている PC では  Rscript -e 'cat(source("tools/gam_data.R")$value)' > data.json  でも同じ計算ができる。
library(mgcv)

GRID_COUNT <- 101          # 曲線を描く点の数
SEED_MAIN <- 1             # 例A（4変数）の乱数の種
SEED_SINGLE <- 11          # 例B（1変数）
SEED_POISSON <- 5          # 例C（ポアソン）
SEED_REPEAT <- 100         # GCV と REML の繰り返し比較
SEED_KCHECK <- 1           # k.check の並べ替え検定
N_MAIN <- 400
N_SINGLE <- 200
NOISE_SD <- 2
REPEAT_COUNT <- 300
REPEAT_K <- 20
K_VALUES <- c(5, 10, 20, 40)
WIDE_K <- 40                # 基底を多めにした例の k

# gamSim(1) と同じ真の関数（Gu & Wahba の4変数の例）
true_f0 <- function(x) 2 * sin(pi * x)
true_f1 <- function(x) exp(2 * x)
true_f2 <- function(x) 0.2 * x^11 * (10 * (1 - x))^6 + 10 * (10 * x)^3 * (1 - x)^10
true_f3 <- function(x) 0 * x
TRUE_FUNCTIONS <- list(true_f0, true_f1, true_f2, true_f3)

rows <- function(m) lapply(seq_len(nrow(m)), function(i) unname(m[i, ]))

# ------------------------------------------------------------------ 例A: 4変数の加法モデル
set.seed(SEED_MAIN)
dat <- gamSim(1, n = N_MAIN, dist = "normal", scale = NOISE_SD, verbose = FALSE)
fit_reml <- gam(y ~ s(x0) + s(x1) + s(x2) + s(x3), data = dat, method = "REML")
fit_gcv <- gam(y ~ s(x0) + s(x1) + s(x2) + s(x3), data = dat)   # 既定の GCV.Cp

term_names <- c("x0", "x1", "x2", "x3")
grids <- lapply(term_names, function(v) seq(min(dat[[v]]), max(dat[[v]]), length.out = GRID_COUNT))
names(grids) <- term_names
grid_frame <- as.data.frame(grids)
partial_reml <- predict(fit_reml, grid_frame, type = "terms", se.fit = TRUE)
partial_gcv <- predict(fit_gcv, grid_frame, type = "terms")
terms_out <- lapply(seq_along(term_names), function(j) {
  v <- term_names[j]
  f <- TRUE_FUNCTIONS[[j]]
  list(
    name = v,
    grid = grids[[v]],
    fit = unname(partial_reml$fit[, j]),
    se = unname(partial_reml$se.fit[, j]),
    fitGcv = unname(partial_gcv[, j]),
    truth = f(grids[[v]]) - mean(f(dat[[v]]))   # 項は平均0にそろえて比べる
  )
})
summary_reml <- summary(fit_reml)
main <- list(
  n = N_MAIN, noiseSd = NOISE_SD, seed = SEED_MAIN,
  x = lapply(term_names, function(v) dat[[v]]),
  y = dat$y,
  terms = terms_out,
  intercept = unname(coef(fit_reml)[1]),
  sp = unname(fit_reml$sp),
  spGcv = unname(fit_gcv$sp),
  edf = unname(summary_reml$edf),
  edfGcv = unname(summary(fit_gcv)$edf),
  sTable = rows(summary_reml$s.table),
  pTable = unname(summary_reml$p.table[1, ]),
  rsq = summary_reml$r.sq, devExpl = summary_reml$dev.expl,
  scale = fit_reml$sig2, reml = unname(fit_reml$gcv.ubre),
  outerIter = fit_reml$outer.info$iter,
  coefCount = length(coef(fit_reml)),
  summaryText = capture.output(print(summary_reml))
)

# ---- 平滑化項を2つにしたモデル（REML の面を描く）。ガウスなので X'X、X'y、y'y だけあれば計算できる
pre2 <- gam(y ~ s(x1) + s(x2), data = dat, method = "REML", fit = FALSE)
fit2 <- gam(y ~ s(x1) + s(x2), data = dat, method = "REML")
two <- list(
  n = N_MAIN,
  XtX = rows(crossprod(pre2$X)), Xty = as.vector(crossprod(pre2$X, dat$y)), yty = sum(dat$y^2),
  S = lapply(pre2$S, rows), off = pre2$off,
  initialSp = unname(initial.sp(pre2$X, pre2$S, pre2$off)),
  sp = unname(fit2$sp), reml = unname(fit2$gcv.ubre), scale = fit2$sig2,
  outerIter = fit2$outer.info$iter, edf = unname(summary(fit2)$edf),
  Xp = rows(predict(fit2, grid_frame, type = "lpmatrix")),   # 列 2〜10 が s(x1)、11〜19 が s(x2)
  grid1 = grids$x1, grid2 = grids$x2,
  truth1 = terms_out[[2]]$truth, truth2 = terms_out[[3]]$truth
)

# ------------------------------------------------------------------ 例B: 1変数（基底・ペナルティ・λ の説明に使う）
set.seed(SEED_SINGLE)
single_x <- runif(N_SINGLE)
single_y <- true_f2(single_x) + rnorm(N_SINGLE, 0, NOISE_SD)
single_frame <- data.frame(x = single_x, y = single_y)
single_grid <- seq(0, 1, length.out = GRID_COUNT)
single_new <- data.frame(x = single_grid)
pre1 <- gam(y ~ s(x, k = 10), data = single_frame, method = "REML", fit = FALSE)
fit1_reml <- gam(y ~ s(x, k = 10), data = single_frame, method = "REML")
fit1_gcv <- gam(y ~ s(x, k = 10), data = single_frame)

# 制約を入れる前の基底（定数・1次を含む10本）と、自分で固有値分解して作った基底が同じ空間を張るか
basis_raw <- smoothCon(s(x, k = 10), data = single_frame, absorb.cons = FALSE)[[1]]
radial <- abs(outer(single_x, single_x, "-"))^3 / 12
eig <- eigen(radial, symmetric = TRUE)
by_size <- order(abs(eig$values), decreasing = TRUE)
top_vectors <- eig$vectors[, by_size[1:10]]
top_values <- eig$values[by_size[1:10]]
poly_part <- cbind(1, single_x)
null_basis <- qr.Q(qr(crossprod(top_vectors, poly_part)), complete = TRUE)[, 3:10]   # T'U δ = 0 を満たす δ
own_basis <- cbind(top_vectors %*% diag(top_values) %*% null_basis, poly_part)
span_gap <- max(abs(qr.resid(qr(own_basis), basis_raw$X))) / max(abs(basis_raw$X))

single <- list(
  n = N_SINGLE, noiseSd = NOISE_SD, seed = SEED_SINGLE,
  x = single_x, y = single_y, grid = single_grid, truth = true_f2(single_grid),
  X = rows(pre1$X), S = rows(pre1$S[[1]]),
  Xp = rows(predict(fit1_reml, single_new, type = "lpmatrix")),
  rawBasis = rows(PredictMat(basis_raw, single_new)),
  eigenAbs = abs(eig$values[by_size[1:40]]),
  spanGap = span_gap,
  sp = unname(fit1_reml$sp), coef = unname(coef(fit1_reml)), edf = sum(fit1_reml$edf),
  reml = unname(fit1_reml$gcv.ubre), scale = fit1_reml$sig2,
  spGcv = unname(fit1_gcv$sp), gcv = unname(fit1_gcv$gcv.ubre), edfGcv = sum(fit1_gcv$edf)
)

# 基底を多めにした例（k = WIDE_K）。λ を動かす図と、GCV・REML の曲線に使う
pre_wide <- gam(y ~ s(x, k = WIDE_K), data = single_frame, method = "REML", fit = FALSE)
fit_wide_reml <- gam(y ~ s(x, k = WIDE_K), data = single_frame, method = "REML")
fit_wide_gcv <- gam(y ~ s(x, k = WIDE_K), data = single_frame)
wide <- list(
  k = WIDE_K,
  X = rows(pre_wide$X), S = rows(pre_wide$S[[1]]),
  Xp = rows(predict(fit_wide_reml, single_new, type = "lpmatrix")),
  sp = unname(fit_wide_reml$sp), edf = sum(fit_wide_reml$edf), reml = unname(fit_wide_reml$gcv.ubre), scale = fit_wide_reml$sig2,
  spGcv = unname(fit_wide_gcv$sp), edfGcv = sum(fit_wide_gcv$edf), gcv = unname(fit_wide_gcv$gcv.ubre)
)

# k を変えたときの当てはめと k.check（第8章）
set.seed(SEED_KCHECK)
k_out <- lapply(K_VALUES, function(k) {
  fit <- gam(y ~ s(x, k = k), data = single_frame, method = "REML")
  pred <- predict(fit, single_new, se.fit = TRUE)
  check <- k.check(fit)
  list(k = k, fit = unname(pred$fit), se = unname(pred$se.fit), sp = unname(fit$sp),
       kPrime = unname(check[1, 1]), edf = unname(check[1, 2]), kIndex = unname(check[1, 3]), pValue = unname(check[1, 4]),
       reml = unname(fit$gcv.ubre), aic = AIC(fit))
})

# ------------------------------------------------------------------ 例C: ポアソン（P-IRLS の説明に使う）
set.seed(SEED_POISSON)
pois_x <- runif(N_SINGLE)
pois_eta <- function(x) 1.0 + 1.2 * sin(2 * pi * x) + 0.8 * x
pois_y <- rpois(N_SINGLE, exp(pois_eta(pois_x)))
pois_frame <- data.frame(x = pois_x, y = pois_y)
pre_p <- gam(y ~ s(x), family = poisson, data = pois_frame, method = "REML", fit = FALSE)
fit_p <- gam(y ~ s(x), family = poisson, data = pois_frame, method = "REML")
poisson_out <- list(
  n = N_SINGLE, seed = SEED_POISSON,
  x = pois_x, y = pois_y, grid = single_grid, etaTrue = pois_eta(single_grid),
  X = rows(pre_p$X), S = rows(pre_p$S[[1]]),
  Xp = rows(predict(fit_p, single_new, type = "lpmatrix")),
  sp = unname(fit_p$sp), coef = unname(coef(fit_p)), deviance = deviance(fit_p), edf = sum(fit_p$edf),
  innerIter = fit_p$iter, outerIter = fit_p$outer.info$iter, reml = unname(fit_p$gcv.ubre)
)

# ------------------------------------------------------------------ GCV と REML を、データを作り直して繰り返し比べる
repeat_study <- function(f) {
  set.seed(SEED_REPEAT)
  out <- matrix(0, REPEAT_COUNT, 4)
  worst <- NULL   # GCV の有効自由度がいちばん大きかった回（曲線を図に出す）
  for (r in seq_len(REPEAT_COUNT)) {
    x <- runif(N_SINGLE)
    d <- data.frame(x = x, y = f(x) + rnorm(N_SINGLE, 0, NOISE_SD))
    a <- gam(y ~ s(x, k = REPEAT_K), data = d, method = "REML")
    g <- gam(y ~ s(x, k = REPEAT_K), data = d, method = "GCV.Cp")
    truth <- f(single_grid)
    out[r, ] <- c(sum(a$edf), sum(g$edf),
                  mean((predict(a, single_new) - truth)^2), mean((predict(g, single_new) - truth)^2))
    if (out[r, 2] >= max(out[seq_len(r), 2])) {
      worst <- list(index = r, x = x, y = d$y, truth = truth, fitReml = unname(predict(a, single_new)),
                    fitGcv = unname(predict(g, single_new)), edfReml = out[r, 1], edfGcv = out[r, 2])
    }
  }
  list(edfReml = out[, 1], edfGcv = out[, 2], mseReml = out[, 3], mseGcv = out[, 4], worst = worst)
}
repeats <- list(k = REPEAT_K, count = REPEAT_COUNT, n = N_SINGLE, noiseSd = NOISE_SD,
                smooth = repeat_study(true_f0), wiggly = repeat_study(true_f2))

result <- list(
  mgcvVersion = as.character(packageVersion("mgcv")), rVersion = R.version.string,
  main = main, two = two, single = single, wide = wide, kStudy = k_out, poisson = poisson_out, repeats = repeats
)
as.character(jsonlite::toJSON(result, digits = I(9), auto_unbox = TRUE))
