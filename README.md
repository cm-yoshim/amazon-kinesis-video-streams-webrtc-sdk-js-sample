## 概要
[これ](https://github.com/awslabs/amazon-kinesis-video-streams-webrtc-sdk-js)への理解を深めるためにReactを使ったりSDKのバージョンを新しいのにしてみたりした。


## 前提
AWS環境に「kinesis video streams」に関する権限を持ったIAMユーザーを作成してください。  
作成できたら、「awsConfig.ts」ファイルにクレデンシャルを記載してください。  
(Cognito等を利用するように修正したい...)


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

![画面](./images/kvs_react_app_1.png)

もしまだシグナリングチャンネルが無いようなら適当な名前で作成してください。  
(アカウント内で一意である必要があります)
![画面](./images/kvs_react_app_2.png)

シグナリングチャンネル、っていうのは「Kinesis Video Streams」のリソースです。  
AWSのマネコンだとこんな感じです。  
![画面](./images/kvs_react_app_3.png)

シグナリングチャンネルが作成できているようなら、チャンネル名を指定して「Master」としてブラウザのWebカメラの動画を送信開始します。
![画面](./images/kvs_react_app_4.png)

送信されている動画はAWSのマネコンからも確認できます。
![画面](./images/kvs_react_app_5.png)

AWSのマネコンからMasterとして参加し、ローカルからはViewerとして参加することもできます。  
(どちらも同一のPCで一人でやったので同じ画像ですが...)
![画面](./images/kvs_react_app_6.png)


## 参考

- [amazon-kinesis-video-streams-webrtc-sdk-js](https://github.com/awslabs/amazon-kinesis-video-streams-webrtc-sdk-js)
- [mganeko/kvs_webrtc_example](https://github.com/mganeko/kvs_webrtc_example)