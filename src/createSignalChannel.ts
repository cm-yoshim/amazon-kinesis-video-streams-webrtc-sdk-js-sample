import {
    KinesisVideoClient,
    CreateSignalingChannelCommand,
    CreateSignalingChannelCommandInput
} from "@aws-sdk/client-kinesis-video";
import { awsConfig } from './awsConfig';

const client = new KinesisVideoClient({ 
    region: awsConfig.region,
    credentials: {
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey,
    } 
});

export const createSignalingChannel = async (channelName: string) => {
    try {
        const params: CreateSignalingChannelCommandInput = {
            ChannelName: channelName,
            ChannelType: 'SINGLE_MASTER',
            SingleMasterConfiguration: {
                MessageTtlSeconds: 60
            },
        };
        const command = new CreateSignalingChannelCommand(params);
        await client.send(command); 
        alert(`${channelName}チャンネルの作成に成功しました!!`);
    } catch (error) {
        console.log('Failed in createSignalingChannel.');
        console.log(`error: ${JSON.stringify(error)}`)
        alert(`${channelName}チャンネルの作成に失敗しました!!`);
    }
};
