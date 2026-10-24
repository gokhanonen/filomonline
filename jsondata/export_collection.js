#!/usr/bin/env node
const fs = require("fs");
const os = require("os");
const path = require("path");

const collectionName = process.argv[2];
const customOutputFile = process.argv[3];

if (!collectionName) {
  console.error("Kullanım: node export_collection.js <collectionName> [outputFileName]");
  console.error("Örnek:   node export_collection.js brands");
  process.exit(1);
}

const configPath = path.join(os.homedir(), ".config/configstore/firebase-tools.json");
if (!fs.existsSync(configPath)) {
  console.error("Firebase CLI oturumu bulunamadı. Lütfen önce firebase login komutunu çalıştırın.");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const accessToken = config.tokens && config.tokens.access_token;
const projectId = "turgut-86a70";

if (!accessToken) {
  console.error("Firebase access token bulunamadı.");
  process.exit(1);
}

function parseFirestoreValue(val) {
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.integerValue !== undefined) return parseInt(val.integerValue, 10);
  if (val.doubleValue !== undefined) return parseFloat(val.doubleValue);
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.timestampValue !== undefined) return val.timestampValue;
  if (val.nullValue !== undefined) return null;
  if (val.arrayValue !== undefined) return (val.arrayValue.values || []).map(parseFirestoreValue);
  if (val.mapValue !== undefined) {
    const obj = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      obj[k] = parseFirestoreValue(v);
    }
    return obj;
  }
  return val;
}

function parseDoc(doc) {
  const id = doc.name.split("/").pop();
  const result = { id };
  if (doc.fields) {
    for (const [k, v] of Object.entries(doc.fields)) {
      result[k] = parseFirestoreValue(v);
    }
  }
  return result;
}

async function exportCollection() {
  console.log("Firestore koleksiyonu okunuyor: " + collectionName);
  let allDocs = [];
  let pageToken = "";
  let pageCount = 0;

  do {
    pageCount++;
    const url = "https://firestore.googleapis.com/v1/projects/" + projectId + "/databases/(default)/documents/" + collectionName + (pageToken ? "?pageToken=" + encodeURIComponent(pageToken) : "");
    const res = await fetch(url, {
      headers: { Authorization: "Bearer " + accessToken }
    });
    const data = await res.json();
    if (data.error) {
      throw new Error(data.error.message || JSON.stringify(data.error));
    }
    if (data.documents && data.documents.length > 0) {
      allDocs.push(...data.documents.map(parseDoc));
      console.log("Sayfa " + pageCount + ": Toplam " + allDocs.length + " doküman çekildi.");
    }
    pageToken = data.nextPageToken || "";
  } while (pageToken);

  const fileName = customOutputFile || (collectionName + ".json");
  const outPath = path.resolve(__dirname, fileName);
  fs.writeFileSync(outPath, JSON.stringify(allDocs, null, 2), "utf8");
  console.log("Başarılı! " + allDocs.length + " doküman kaydedildi: " + outPath);
}

exportCollection().catch(err => {
  console.error("Hata oluştu:", err.message);
  process.exit(1);
});