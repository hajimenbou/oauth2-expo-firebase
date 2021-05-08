import React, { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { AuthSession, makeRedirectUri, useAuthRequest, useAutoDiscovery, ResponseType, useAutoExchange } from 'expo-auth-session';
import { StyleSheet, Button, View, Text, Platform } from 'react-native';
import jwt_decode from "jwt-decode";
import * as Linking from 'expo-linking';
import * as firebase from 'firebase';
require("firebase/functions")

// firebaseの設定
if (!firebase.apps.length) {
  const firebaseConfig = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
  };

  firebase.initializeApp(firebaseConfig);
}

WebBrowser.maybeCompleteAuthSession();

export default function App() {
  // Endpointの設定
  // useAutoDiscovery()を使うと、自動でtokenendpoint等を生成してくれる
  const discovery = useAutoDiscovery('http://<wifiのアドレス>:8080/auth/realms/demo');
  const createUrl = Linking.createURL('login').replace(/\/\/\//g, '//');
  // Requestの設定と実行
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: 'demo-client',
      // 本当はresponseType: 'code'としたかったが、
      // レスポンスから更にAuthSession.exchangeCodeAsync()するとエラーとなり一旦インプリシットフローにした
      responseType: 'id_token',
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      redirectUri: Linking.createURL('login').replace(/\/\/\//g, '//'),
      extraParams: {
        nonce: 'nonce',
      },
    },
    discovery
  );

  const [firebaseAccessToken, setFirebaseAccessToken] = useState('');

  // 外部サイトにoauthログインした後に走る処理
  React.useEffect(() => {
    if (response?.type === 'success') {
      // リクエストが成功した後の処理
      const idToken = response.params.id_token;
      const jwtDecoded = jwt_decode(idToken);

      // firebase authに入るユーザー UID 対象アプリユニークのprefixを付けると良い
      const appUid = '<hogeapp>:' + jwtDecoded['sub'];

      // useEffect()内部で非同期処理をうまく書く方法がよくわからない
      const signIn = async (uid) => {
        // subクレームの値をcloud functionで作成したAPIに投げて、firebase auth側のログイン処理を実行する
        const authFunc = firebase.functions().httpsCallable("auth");
        const customToken = await authFunc({ uid: uid });

        // 取得したカスタムトークンを使ってfirebase authにサインインする
        try {
          const credential = await firebase.auth().signInWithCustomToken(customToken.data)

          // ログイン確認の表示用
          const credentialUser = credential.user.toJSON();
          setFirebaseAccessToken(credentialUser.stsTokenManager.accessToken);
        } catch (e) {
          console.log(e);
        }
      }
      signIn(appUid)
    };
  }, [response]);

  return (
    <View style={styles.container}>
      <Button
        disabled={!request}
        title="Login"
        onPress={() => {
          promptAsync();
        }}
      />
      <Text disabled={!createUrl}>redirect uri: {createUrl}</Text>
      <Text disabled={!firebaseAccessToken}>custom access token: {firebaseAccessToken}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

