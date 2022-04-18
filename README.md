## 概要
[これ](https://github.com/awslabs/amazon-kinesis-video-streams-webrtc-sdk-js)への理解を深めるためにReactを使ったりSDKのバージョンを新しいのにしてみたりした。


## 前提
AWS環境に「kinesis video streams」に関する権限を持ったIAMユーザーを作成してください。  
作成できたら、「[awsConfig.ts](https://github.com/cm-yoshim/amazon-kinesis-video-streams-webrtc-sdk-js-sample/blob/main/src/awsConfig.ts)」ファイルにクレデンシャルを記載してください。  
(実利用する際は、異なる認証の仕組みの採用を検討してください)


## 試し方

installして

```
$ yarn install
```

動かしてみると

```
$ yarn start
```

こんな画面が表示されるので

![画面](https://user-images.githubusercontent.com/43127868/163390802-24caee03-f31b-4cfd-b17c-de49b7e2a264.png)

もしまだシグナリングチャンネルが無いようなら適当な名前で作成してください。  
(アカウント内で一意である必要があります)

![画面](https://user-images.githubusercontent.com/43127868/163390817-fd490a5e-3444-4765-89ea-5aa591b7581c.png)

シグナリングチャンネル、っていうのは「Kinesis Video Streams」のリソースです。  
AWSのマネコンだとこんな感じです。  

![画面](https://user-images.githubusercontent.com/43127868/163390841-3d3e4e4d-b3c8-456c-8bf6-f7655b1e3a99.png)

シグナリングチャンネルが作成できているようなら、チャンネル名を指定して「Master」としてブラウザのWebカメラの動画を送信開始します。

![画面](https://user-images.githubusercontent.com/43127868/163390857-93b8ad98-4638-4b8b-ba5b-ec7ddb4c87f4.png)

送信されている動画はAWSのマネコンからも確認できます。

![画面](https://user-images.githubusercontent.com/43127868/163390869-784c438c-4aac-4d28-a51c-65b38a2e1412.png)

AWSのマネコンからMasterとして参加し、ローカルからはViewerとして参加することもできます。  
(どちらも同一のPCで一人でやったので同じ画像ですが...)

![画面](https://user-images.githubusercontent.com/43127868/163390898-3a7fbaeb-c6c5-43aa-b618-d606538c5c1c.png)


## 仕組みについて
Kinesis Video Streams、WebRTCの仕組みについて学びたい場合は以下ページがとても参考になる。  
このページを一度読んでおくと、本スクリプトの中で実行している内容についても理解が深まるので是非一度ご確認いただきたい。

- [Kinesis Video Streams with WebRTC: How It Works](https://docs.aws.amazon.com/ja_jp/kinesisvideostreams-webrtc-dg/latest/devguide/kvswebrtc-how-it-works.html
)

## 参考

- [amazon-kinesis-video-streams-webrtc-sdk-js](https://github.com/awslabs/amazon-kinesis-video-streams-webrtc-sdk-js)
- [mganeko/kvs_webrtc_example](https://github.com/mganeko/kvs_webrtc_example)
- [Kinesis Video Streams with WebRTC: How It Works](https://docs.aws.amazon.com/ja_jp/kinesisvideostreams-webrtc-dg/latest/devguide/kvswebrtc-how-it-works.html)
- [私のブログ](https://dev.classmethod.jp/cloud/aws/kvs-sdk-js-v3-with-react/)