const REGION =  "ap-northeast-1";

// 実際に利用する際は、ベタ書きではなく異なる仕組みを検討すること
const ACCESS_KEY_ID = '<YOUR_ACCESS_KEY_ID>';
const SECRET_ACCESS_KEY = '<YOUR_SECRET_ACCESS_KEY>';

export const awsConfig = {
    region: REGION,
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY
};
