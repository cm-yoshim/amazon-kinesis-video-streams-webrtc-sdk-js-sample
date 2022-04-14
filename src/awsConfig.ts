const REGION =  "ap-northeast-1";

// TODO: Cognitoから取得する
// https://github.com/aws-samples/amazon-kinesis-video-streams-webrtc-sdk-js-with-amazon-cognito
const ACCESS_KEY_ID = '<YOUR_ACCESS_KEY_ID>';
const SECRET_ACCESS_KEY = '<YOUR_SECRET_ACCESS_KEY>';

export const awsConfig = {
    region: REGION,
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY
};
