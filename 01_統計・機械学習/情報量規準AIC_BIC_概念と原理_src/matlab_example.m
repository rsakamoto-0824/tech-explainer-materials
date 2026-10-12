% スライドの MATLAB コード例をそのまま実行して確かめる（example_data.csv を使用）
T = readtable('example_data.csv');

% 全変数モデルの情報量規準
full = fitlm(T, 'y ~ x1 + x2 + x3 + x4 + x5 + x6 + x7 + x8');
disp(full.ModelCriterion)            % AIC・AICc・BIC・CAIC

% 変数増減法（BIC）
mdl = stepwiselm(T, 'constant', 'ResponseVar', 'y', ...
    'Upper', 'linear', 'Criterion', 'bic', 'Verbose', 0);
disp(mdl.Formula)

% 変数増減法（AIC）
mdlAic = stepwiselm(T, 'constant', 'ResponseVar', 'y', ...
    'Upper', 'linear', 'Criterion', 'aic', 'Verbose', 0);
disp(mdlAic.Formula)

% 係数の数（MATLAB の AIC・BIC は誤差分散を k に数えない）
fprintf('LogLikelihood=%.4f NumCoef=%d\n', full.LogLikelihood, full.NumEstimatedCoefficients);
