// ソニーのイメージセンサー事業 SWOT・PEST分析（2026-09-27）の参考文献を Zotero に登録する。
// 2026-09-26 の重ね合わせ制御ロードマップ資料で実際に動いたスクリプトをもとに、1件に複数ファイルを添付できるようにした。
//
// 使い方（詳しくは同じフォルダの README.md）:
//   Zotero の［ツール］→［開発］→［JavaScriptを実行］を開き、「Run as async」にチェックを入れて、
//   このファイルの中身をすべて貼り付けて「Run」を押す。
//
// することは次の2つだけ。既存の項目の中身・タグ・コレクションを消したり書き換えたりはしない。
//   1. まだ Zotero に無い文献（manifest.json の items）を登録する。
//      「未読」タグを付け、本文ファイル（sources/ の PDF・HTML）はコピーせずリンクで添付する。
//      テーマのコレクション（05_資料）にも入れる。
//   2. 1の文献を、案件のコレクション「2026-09-27_Sonyイメージセンサー事業分析」に入れる（無ければ1階層で作る）。
//
// 何度実行してもよい。同じ文献（Import-ID・DOI・URL のどれかが一致）があれば新しく作らず、足りない分だけ補う。
// 登録済みだった文献には「未読」タグを付け直さない（読み終えて外した可能性があるため）。
// 結果は同じフォルダの result.json に書き出し、画面にも表示する。

var IMPORT_DIRECTORY = "/Users/sakamoto/04_プログラミング/ClaudeCode/GitHub/技術解説資料/08_企業・業界分析/Sonyイメージセンサー事業_SWOT・PEST分析_src/zotero";
var MANIFEST_PATH = IMPORT_DIRECTORY + "/manifest.json";
var RESULT_PATH = IMPORT_DIRECTORY + "/result.json";
var SURVEY_NOTE = "調査: ソニーのイメージセンサー事業 SWOT・PEST分析（2026-09-27）";

var result = {
  status: "running",
  step: "開始",
  case_collection: null,
  created_case_collection: false,
  created: 0,
  reused: 0,
  unread_tagged: 0,
  linked_files: 0,
  existing_files: 0,
  existing_references_added: 0,
  existing_references_not_found: [],
  missing_files: [],
  field_warnings: [],
  failures: [],
  items: [],
  summary: ""
};

async function writeResult() {
  result.updated_at = new Date().toISOString();
  await Zotero.File.putContentsAsync(RESULT_PATH, JSON.stringify(result, null, 2));
}

function normalizeText(value) {
  return value ? String(value).normalize("NFC") : "";
}

function normalizeDOI(value) {
  return normalizeText(value).trim().toLowerCase();
}

function normalizeURL(value) {
  return normalizeText(value).trim().replace(/\/+$/, "").toLowerCase();
}

// 大文字小文字・記号・空白の違いを無視してタイトルを比べる
function normalizeTitle(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9぀-ヿ一-鿿]+/g, "");
}

function fieldOf(item, name) {
  try {
    return item.getField(name) || "";
  }
  catch (error) {
    return "";
  }
}

function importIDOf(item) {
  let match = fieldOf(item, "extra").match(/^Import-ID:\s*(\S+)/m);
  return match ? match[1] : null;
}

// 項目の種類に無い欄は飛ばして記録する（種類ごとに欄の名前が違うため）
function setFieldSafely(item, record, field, value) {
  if (value === null || value === undefined || value === "") return;
  try {
    item.setField(field, value);
  }
  catch (error) {
    result.field_warnings.push({ key: record.key, field: field, error: String(error) });
  }
}

async function fileExists(path) {
  try {
    return await IOUtils.exists(path);
  }
  catch (error) {
    return Zotero.File.pathToFile(path).exists();
  }
}

function fileNameOf(path) {
  return normalizeText(path).split("/").pop();
}

// 1件に複数ファイル（複数ページの記事など）を添付できるようにする。古い形式の file にも対応する
function filesOf(record) {
  if (Array.isArray(record.files)) return record.files;
  return record.file ? [record.file] : [];
}

try {
  result.step = "manifest.json の読み込み";
  var manifest = JSON.parse(await Zotero.File.getContentsAsync(MANIFEST_PATH));
  if (!manifest.case_collection || !manifest.unread_tag || !Array.isArray(manifest.items)) {
    throw new Error("manifest.json に case_collection・unread_tag・items が必要です");
  }
  var libraryID = Zotero.Libraries.userLibraryID;

  result.step = "既存の項目の確認";
  // タグ検索は使わず、ライブラリ全体を走査して照合する（タグを消されても二重登録しないため）
  var allItems = (await Zotero.Items.getAll(libraryID, true, false)).filter(item => item.isRegularItem() && !item.deleted);
  var byImportID = new Map();
  var byDOI = new Map();
  var byURL = new Map();
  var byTitle = new Map();
  for (let item of allItems) {
    let importID = importIDOf(item);
    if (importID) byImportID.set(importID, item);
    let doi = normalizeDOI(fieldOf(item, "DOI"));
    if (doi) byDOI.set(doi, item);
    let url = normalizeURL(fieldOf(item, "url"));
    if (url) byURL.set(url, item);
    let title = normalizeTitle(fieldOf(item, "title"));
    if (title && !byTitle.has(title)) byTitle.set(title, item);
  }
  await writeResult();

  result.step = "コレクションの確認";
  function findTopLevelCollection(name) {
    return Zotero.Collections.getByLibrary(libraryID, true).find(candidate => candidate.name === name && !candidate.parentID);
  }
  // テーマのコレクションは既存のものだけを使う（無ければ止める）
  var themeCollections = new Map();
  for (let name of new Set(manifest.items.map(record => record.collection))) {
    let found = findTopLevelCollection(name);
    if (!found) throw new Error("テーマのコレクションが見つかりません: " + name);
    themeCollections.set(name, found);
  }
  // 案件のコレクションは無ければ1階層で作る
  var caseCollection = findTopLevelCollection(manifest.case_collection);
  if (!caseCollection) {
    caseCollection = new Zotero.Collection();
    caseCollection.libraryID = libraryID;
    caseCollection.name = manifest.case_collection;
    await caseCollection.saveTx();
    result.created_case_collection = true;
  }
  result.case_collection = manifest.case_collection;
  await writeResult();

  result.step = "新しい文献の登録";
  for (let record of manifest.items) {
    try {
      let item = byImportID.get(record.importId)
        || (record.fields.DOI ? byDOI.get(normalizeDOI(record.fields.DOI)) : null)
        || (record.fields.url ? byURL.get(normalizeURL(record.fields.url)) : null);
      let isNew = !item;
      let files = filesOf(record);
      if (isNew) {
        item = new Zotero.Item(record.itemType);
        item.libraryID = libraryID;
        item.setField("title", record.title);
        setFieldSafely(item, record, "date", record.date);
        for (let [field, value] of Object.entries(record.fields)) {
          setFieldSafely(item, record, field, value);
        }
        if (record.creators.length) item.setCreators(record.creators);
        let extra = ["Import-ID: " + record.importId];
        for (let file of files) extra.push("元ファイル: " + file);
        extra.push(SURVEY_NOTE);
        item.setField("extra", extra.join("\n"));
        for (let tag of record.tags) item.addTag(tag);
        item.addTag(manifest.unread_tag);
        result.unread_tagged += 1;
      }
      // コレクションは足すだけにする（既存の所属は外さない）
      item.addToCollection(themeCollections.get(record.collection).id);
      item.addToCollection(caseCollection.id);
      await item.saveTx();
      if (isNew) {
        result.created += 1;
        byImportID.set(record.importId, item);
      }
      else {
        result.reused += 1;
      }

      for (let file of files) {
        let path = normalizeText(manifest.base + "/" + file);
        if (!(await fileExists(path))) {
          result.missing_files.push(path);
          continue;
        }
        let attachments = await Zotero.Items.getAsync(item.getAttachments());
        // ソニー版とサムスン版は共通の資料を別々のフォルダにコピーして持つ。
        // 登録済みの文献に同じファイル名の添付があれば添付済みとみなし、二重に添付しない
        let already = attachments.some(attachment => attachment.isAttachment()
          && (normalizeText(attachment.getFilePath()) === path
            || (!isNew && fileNameOf(attachment.getFilePath()) === fileNameOf(path))));
        if (already) {
          result.existing_files += 1;
        }
        else {
          await Zotero.Attachments.linkFromFile({ file: path, parentItemID: item.id });
          result.linked_files += 1;
        }
      }
      result.items.push({ key: record.key, zotero_key: item.key, status: isNew ? "created" : "reused" });
    }
    catch (error) {
      result.failures.push({ key: record.key, error: String(error) });
    }
    await writeResult();
  }

  result.step = "登録済みの文献を案件のコレクションへ追加";
  for (let reference of manifest.existing_references || []) {
    try {
      let item = (reference.doi ? byDOI.get(normalizeDOI(reference.doi)) : null)
        || (reference.title ? byTitle.get(normalizeTitle(reference.title)) : null);
      if (!item) {
        result.existing_references_not_found.push(reference.key);
        continue;
      }
      if (!item.inCollection(caseCollection.id)) {
        item.addToCollection(caseCollection.id);
        await item.saveTx();
      }
      result.existing_references_added += 1;
    }
    catch (error) {
      result.failures.push({ key: reference.key, error: String(error) });
    }
  }

  result.step = "完了";
  result.status = result.failures.length ? "completed_with_errors" : "completed";
}
catch (error) {
  result.status = "failed";
  result.failures.push({ step: result.step, error: String(error) });
}
result.summary = `新規登録 ${result.created} 件（うち「未読」タグ ${result.unread_tagged} 件）、登録済みの再利用 ${result.reused} 件、`
  + `ファイルのリンク添付 ${result.linked_files} 件（添付済み ${result.existing_files} 件）、失敗 ${result.failures.length} 件`;
await writeResult();
return result;
