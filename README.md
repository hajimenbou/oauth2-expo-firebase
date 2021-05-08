### 概要

- expo + firebase authorizationの連携のテスト
- firebase authは独自で立ち上げたopenid connectサーバーと連携してカスタム認証機能を使う
- iosでしか試せていない

### 構成

- クライアントアプリ(client/)
    - expo + firebase
    - keycloakとopenid connectで認証して取得したid tokenを使ってfirebase authのカスタム認証を行う
- 認可サーバー(authorization-server/)
    - keycloak
    - wifiのIPを使い、localhostにdockerで環境を作る
- firebaseと認可サーバーを繋ぐサーバー(server/)
    - cloud function
    - カスタム認証を行う際、firebase authとのやり取りでcloud functionでしか使えない関数があるので、ユーザー固有値からカスタムトークンを作成する機能を担う

#### 認可サーバー(keycloak)の起動

> 参考
> https://zenn.dev/backpaper0/articles/keycloak-getting-started

- httpsでも繋がるようにmkcertでオレオレ証明書を作成する
    - mkcert 0.0.0.0 localhost 127.0.0.1 ::1 <wifiのアドレス>
    - cp 0.0.0.0+4.pem authorization-server/certs/tls.crt
    - cp 0.0.0.0+4-key.pem authorization-server/certs/tls.key
- dokcerで環境を立ち上げる
    - 設定ファイルはdemo_realm.jsonに入っているので下記コマンドで読み込ませる
```
docker run --name kc -d -p 8080:8080 -p 8443:8443 \
  -e KEYCLOAK_USER=admin -e KEYCLOAK_PASSWORD=secret \
  -e KEYCLOAK_IMPORT=/tmp/demo_realm.json \
  -v $(pwd)/demo_realm.json:/tmp/demo_realm.json \
  -v $(pwd)/certs/tls.crt:/etc/x509/https/tls.crt \
  -v $(pwd)/certs/tls.key:/etc/x509/https/tls.key \
  jboss/keycloak
```
- ブラウザでhttps://<wifiのアドレス>:8443にアクセスできれば成功

### cloud functionにapiを作成する

- firebase側でプロジェクトを作成する
    - cloud functionはfreeプランだと使えないので、breazeプランに変更する必要がある
- ソースを対象プロジェクトにデプロイする
    - cd server
    - firebase init
    - firebase deploy --only functions

### expoを使って実際にアプリを動かす

- 必要な設定情報をclient/App.jsonとclient/App.jsに入力する
    - App.json
        - bundleIdentifier
            - apple developer側で登録した値
    - App.js
        - firebaseの設定
            - apiKeyを始め、7点の設定値
        - keycloan側のドメイン
            - 前述の手順でローカルで立ち上げる場合はwifiのアドレス
        - firebase authのuidのprefix値
            - アプリ固有のものが良い
- expo goで動作確認
    - cd client
    - npm start
        - 表示されたQRコードを読み取り、expo go app側でアプリが起動すれば成功
        - loginのリンクで開くページは、上記keyclokを使う場合 id: test1 pass: testでログインできる
- standalone版を作成する
    - apple developerの設定が別途必要
    - expo build:iosでipaファイルを作成する
    - transpoter.appでipaファイルをデリバリする

## 懸念点

- 認可サーバーで取得したjwtをクライアント側で検証できていない
    - react native(expo)でjwt検証に適したライブラリが無い？
        - jsで検証に使う node-jsonwebtoken はexpoだとインストールがうまくできなかった
        - https://github.com/auth0/node-jsonwebtoken/issues/530
        - 上記記事にある react-native-pure-jwt は動作するアルゴリズムが限定的な模様
        - https://github.com/zaguiini/react-native-pure-jwt/issues/10
    - cloud functionにjwtの中身のsub clamを投げているが、id tokenごと投げて、cloud function側で検証したほうが良いかも
        - Firebase Admin SDK(cloud function上で使えるSDK)は検証ライブラリを提供している模様
        - https://firebase.google.com/docs/auth/admin/verify-id-tokens?hl=ja
    - cloud functionのGETのパラメータでid tokenを投げると128文字を越えてますとエラーが出るので、POST APIを別で作れば解決する？
        - ここはまだ試せていない
- expoとkeycloakに登録するredirect urlについて
    - redirect url は standalone で動作させると、expoの仕様でapp.jsonのschemeに登録している名前のurl schemaに飛ぶようになる
    - ただ、例えば myexpoapp:// だけではkeycloak側の仕様のためか登録できなかったので、myexpoapp://login と特にexpo上では設定していないroutingを設定したところ動作した
    - ログイン後飛ばしたいページがあると思うのでそれを指定すれば大丈夫そうではある、、これはテスト用なので1ページしかなく、強引にやってる感はある