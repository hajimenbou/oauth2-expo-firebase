import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (admin.apps.length < 1) {
    admin.initializeApp();
}

// getのパラメータを受け取って
// @todo ここはPOSTでuidを作る前のid tokenを受け取ってjwtの検証までやったほうが良いかも
exports.auth = functions.https.onCall(async (data, context) => {
    // パラメタからUIDを取得
    const uid: string | null = data.uid || null;
    if (!uid) return null;

    // カスタムトークンの作成
    const customToken = await admin.auth().createCustomToken(uid);

    return customToken
});
