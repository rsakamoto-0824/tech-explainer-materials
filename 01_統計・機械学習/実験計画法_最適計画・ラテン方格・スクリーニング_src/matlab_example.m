% スライドの MATLAB コード例をそのまま実行して確かめる
% 2^(7-4) 一部実施要因計画（D=AB, E=AC, F=BC, G=ABC）
X = fracfact('a b c ab ac bc abc');
disp(size(X))

% D最適計画：2因子・2次モデル・12回
rng(1)
[dD, XD] = cordexch(2, 12, 'quadratic', 'tries', 50);
disp(sortrows(dD))
fprintf('log det = %.3f\n', log(det(XD' * XD)))

% ラテン方格の分散分析
T = readtable('latin_square.csv');
p = anovan(T.y, {T.row, T.col, T.trt}, 'varnames', {'row', 'col', 'trt'}, 'display', 'off');
disp(p')
