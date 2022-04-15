import { 
    ChannelRole,
    DescribeSignalingChannelCommand,
    DescribeSignalingChannelCommandOutput,
    GetSignalingChannelEndpointCommand,
    GetSignalingChannelEndpointCommandInput,
    GetSignalingChannelEndpointCommandOutput,
    KinesisVideoClient,
    KinesisVideoClientConfig,
} from "@aws-sdk/client-kinesis-video";
import {
    KinesisVideoSignalingClient,
    KinesisVideoSignalingClientConfig,
    GetIceServerConfigCommand,
    GetIceServerConfigCommandOutput,
} from "@aws-sdk/client-kinesis-video-signaling"
import { NatTraversal } from './myForm';
import { SignalingClient, Role } from 'amazon-kinesis-video-streams-webrtc';
import { awsConfig } from './awsConfig';

const kinesisVideoClientConfig: KinesisVideoClientConfig = { 
    region: awsConfig.region,
    credentials: {
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey,
    } 
};
const kinesisVideoClient = new KinesisVideoClient(kinesisVideoClientConfig);

const master = {
    signalingClient: null as any,
    peerConnectionByClientId: {} as any,
    dataChannelByClientId: {} as any,
    localStream: null as any,
    remoteStreams: [] as any,
    peerConnectionStatsInterval: null as any,
    localView: null as any,
    remoteView: null as any,
};

interface StartMasterInput {
    channelName: string;
    natTraversal: NatTraversal,
    widescreen: boolean;
    sendVideo: boolean;
    sendAudio: boolean;
    useTrickleICE: boolean;
}

export const startMaster = async (params: StartMasterInput) => {    
    // 以下を参考にする
    // https://github.com/awslabs/amazon-kinesis-video-streams-webrtc-sdk-js#usage
    master.localView = document.getElementById('local-video');
    master.remoteView = document.getElementById('remote-video');

    // Get signaling channel ARN
    const describeSignalingChannelCommand = new DescribeSignalingChannelCommand({
        ChannelName: params.channelName,
    })
    const describeSignalingChannelResponse: DescribeSignalingChannelCommandOutput = await kinesisVideoClient.send(describeSignalingChannelCommand);
    if (!describeSignalingChannelResponse.ChannelInfo!.ChannelARN) {
        throw new Error('Failed in describe channelinfo.');
    }
    const channelARN: string = describeSignalingChannelResponse.ChannelInfo!.ChannelARN;
    console.log('[MASTER] Channel ARN: ', channelARN);

    // Get signaling channel endpoints
    const getSignalingChannelEndpointCommandInput: GetSignalingChannelEndpointCommandInput = {
        ChannelARN: channelARN,
        SingleMasterChannelEndpointConfiguration: {
            Protocols: ['WSS', 'HTTPS'],
            Role: ChannelRole.MASTER,
        },
    };
    const getSignalingChannelEndpointCommand = new GetSignalingChannelEndpointCommand(getSignalingChannelEndpointCommandInput);
    const getSignalingChannelEndpointResponse: GetSignalingChannelEndpointCommandOutput = await kinesisVideoClient.send(getSignalingChannelEndpointCommand);
    if (!getSignalingChannelEndpointResponse.ResourceEndpointList) {
        throw new Error('Failed in describe getSignalingChannelEndpoint.');
    };

    const endpointsByProtocol: { [key: string] : string } = getSignalingChannelEndpointResponse.ResourceEndpointList.reduce((endpoints, endpoint) => {
        // @ts-ignore
        endpoints[endpoint.Protocol] = endpoint.ResourceEndpoint;
        return endpoints;    
    }, {});
    console.log('[MASTER] Endpoints: ', endpointsByProtocol);

    // Create Signaling Client
    master.signalingClient = new SignalingClient({
        channelARN,
        channelEndpoint: endpointsByProtocol.WSS,
        role: Role.MASTER,
        region: awsConfig.region,
        credentials: {
            accessKeyId: awsConfig.accessKeyId,
            secretAccessKey: awsConfig.secretAccessKey,
        },
        systemClockOffset: kinesisVideoClient.config.systemClockOffset,
    });

    // 参考にした⇨https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-kinesis-video-signaling/classes/geticeserverconfigcommand.html
    const kinesisVideoSignalingClientConfig: KinesisVideoSignalingClientConfig = {
        region: awsConfig.region,
        credentials: {
            accessKeyId: awsConfig.accessKeyId,
            secretAccessKey: awsConfig.secretAccessKey,
        },
        endpoint: endpointsByProtocol.HTTPS,
    }
    const kinesisVideoSignalingClient = new KinesisVideoSignalingClient(kinesisVideoSignalingClientConfig);
    
    const getIceServerConfigCommand = new GetIceServerConfigCommand({
        ChannelARN: channelARN,
    })
    const getIceServerConfigCommandResponse: GetIceServerConfigCommandOutput = await kinesisVideoSignalingClient.send(getIceServerConfigCommand);

    const iceServers = [];
    if (params.natTraversal  !== 'DISABLED') {
        iceServers.push({ urls: `stun:stun.kinesisvideo.${awsConfig.region}.amazonaws.com:443` });
    }
    if (params.natTraversal !== 'DISABLED' && getIceServerConfigCommandResponse.IceServerList) {
        getIceServerConfigCommandResponse.IceServerList.forEach(iceServer =>
            iceServers.push({
                urls: iceServer.Uris,
                username: iceServer.Username,
                credential: iceServer.Password,
            }),
        );
    }
    console.log('[MASTER] ICE servers: ', iceServers);

    const configuration: RTCConfiguration = {
        iceServers,
        iceTransportPolicy: params.natTraversal === 'TURN' ? 'relay' : 'all',
    };

    const resolution = params.widescreen ? { width: { ideal: 1280 }, height: { ideal: 720 } } : { width: { ideal: 640 }, height: { ideal: 480 } };
    const constraints = {
        video: params.sendVideo ? resolution : false,
        audio: params.sendAudio,
    };

    // Get a stream from the webcam and display it in the local view. 
    // If no video/audio needed, no need to request for the sources. 
    // Otherwise, the browser will throw an error saying that either video or audio has to be enabled.
    if (params.sendVideo || params.sendAudio) {
        try {
            master.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            master.localView.srcObject = master.localStream;

            // 以下を参考にした
            // https://github.com/mganeko/kvs_webrtc_example/blob/8010721b5ed2a2535d464f0564dc3a0f8b5d7cf5/master.html#L232
            master.localView.play().catch((error: any) => console.log(error))
        } catch (e) {
            console.error('[MASTER] Could not find webcam');
        }
    }

    master.signalingClient.on('open', async () => {
        console.log('[MASTER] Connected to signaling service');
    });

    master.signalingClient.on('sdpOffer', async (offer: RTCSessionDescriptionInit, remoteClientId: string) => {
        console.log('[MASTER] Received SDP offer from client: ' + remoteClientId);

        // Create a new peer connection using the offer from the given client
        const peerConnection = new RTCPeerConnection(configuration);
        master.peerConnectionByClientId[remoteClientId] = peerConnection;

        // コメント機能が必要になったら実装しよう
        // if (params.openDataChannel) {
        //     master.dataChannelByClientId[remoteClientId] = peerConnection.createDataChannel('kvsDataChannel');
        //     peerConnection.ondatachannel = event => {
        //         event.channel.onmessage = params.onRemoteDataMessage;
        //     };
        // }

        // Poll for connection stats
        if (!master.peerConnectionStatsInterval) {
            master.peerConnectionStatsInterval = setInterval(() => peerConnection.getStats().then(), 1000);
        }

        // Send any ICE candidates to the other peer
        peerConnection.addEventListener('icecandidate', ({ candidate }) => {
            if (candidate) {
                console.log('[MASTER] Generated ICE candidate for client: ' + remoteClientId);

                // When trickle ICE is enabled, send the ICE candidates as they are generated.
                if (params.useTrickleICE) {
                    console.log('[MASTER] Sending ICE candidate to client: ' + remoteClientId);
                    master.signalingClient.sendIceCandidate(candidate, remoteClientId);
                }
            } else {
                console.log('[MASTER] All ICE candidates have been generated for client: ' + remoteClientId);

                // When trickle ICE is disabled, send the answer now that all the ICE candidates have ben generated.
                if (!params.useTrickleICE) {
                    console.log('[MASTER] Sending SDP answer to client: ' + remoteClientId);
                    master.signalingClient.sendSdpAnswer(peerConnection.localDescription, remoteClientId);
                }
            }
        });

        // As remote tracks are received, add them to the remote view
        peerConnection.addEventListener('track', event => {
            console.log('[MASTER] Received remote track from client: ' + remoteClientId);
            if (master.remoteView.srcObject) {
                return;
            }
            master.remoteView.srcObject = event.streams[0];
            master.remoteView.play().catch((error: any) => console.log(error))
        });

        // If there's no video/audio, master.localStream will be null. So, we should skip adding the tracks from it.
        if (master.localStream) {
            master.localStream.getTracks().forEach((track: MediaStreamTrack) => peerConnection.addTrack(track, master.localStream));
        }
        await peerConnection.setRemoteDescription(offer);

        // Create an SDP answer to send back to the client
        console.log('[MASTER] Creating SDP answer for client: ' + remoteClientId);
        await peerConnection.setLocalDescription(
            await peerConnection.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            }),
        );

        // When trickle ICE is enabled, send the answer now and then send ICE candidates as they are generated. Otherwise wait on the ICE candidates.
        if (params.useTrickleICE) {
            console.log('[MASTER] Sending SDP answer to client: ' + remoteClientId);
            master.signalingClient.sendSdpAnswer(peerConnection.localDescription, remoteClientId);
        }
        console.log('[MASTER] Generating ICE candidates for client: ' + remoteClientId);
    });

    master.signalingClient.on('iceCandidate', async (candidate: string, remoteClientId: string) => {
        console.log('[MASTER] Received ICE candidate from client: ' + remoteClientId);

        // Add the ICE candidate received from the client to the peer connection
        const peerConnection = master.peerConnectionByClientId[remoteClientId];
        peerConnection.addIceCandidate(candidate);
    });

    master.signalingClient.on('close', () => {
        console.log('[MASTER] Disconnected from signaling channel');
    });

    master.signalingClient.on('error', () => {
        console.error('[MASTER] Signaling client error');
    });

    console.log('[MASTER] Starting master connection');
    master.signalingClient.open();
}

export const stopMaster = () => {
    console.log('[MASTER] Stopping master connection');
    if (master.signalingClient) {
        master.signalingClient.close();
        master.signalingClient = null;
    }

    Object.keys(master.peerConnectionByClientId).forEach(clientId => {
        master.peerConnectionByClientId[clientId].close();
    });
    master.peerConnectionByClientId = [];

    if (master.localStream) {
        master.localStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        master.localStream = null;
    }

    master.remoteStreams.forEach((remoteStream: MediaStream) => remoteStream.getTracks().forEach((track: MediaStreamTrack) => track.stop()));
    master.remoteStreams = [];

    if (master.peerConnectionStatsInterval) {
        clearInterval(master.peerConnectionStatsInterval);
        master.peerConnectionStatsInterval = null;
    }

    if (master.localView) {
        master.localView.srcObject = null;
    }

    if (master.remoteView) {
        master.remoteView.srcObject = null;
    }

    if (master.dataChannelByClientId) {
        master.dataChannelByClientId = {};
    }
}

// TODO: メッセージ送信機能が必要になったら利用する
// const sendMasterMessage = (message: string) => {
//     Object.keys(master.dataChannelByClientId).forEach(clientId => {
//         try {
//             master.dataChannelByClientId[clientId].send(message);
//         } catch (e: any) {
//             console.error('[MASTER] Send DataChannel: ', e.toString());
//         }
//     });
// }
