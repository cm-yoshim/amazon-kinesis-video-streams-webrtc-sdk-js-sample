import { 
    KinesisVideoClient,
    KinesisVideoClientConfig,
    ChannelRole,
    DescribeSignalingChannelCommand,
    DescribeSignalingChannelCommandOutput,
    GetSignalingChannelEndpointCommandInput,
    GetSignalingChannelEndpointCommand,
    GetSignalingChannelEndpointCommandOutput,
} from "@aws-sdk/client-kinesis-video";
import {
    KinesisVideoSignalingClient,
    KinesisVideoSignalingClientConfig,
    GetIceServerConfigCommand,
    GetIceServerConfigCommandOutput
} from "@aws-sdk/client-kinesis-video-signaling"
import { NatTraversal } from './myForm';
import { SignalingClient, Role } from 'amazon-kinesis-video-streams-webrtc';
import { v4 as Uuid } from 'uuid';
import { awsConfig } from './awsConfig';

const viewer = {} as any;

const kinesisVideoClientConfig: KinesisVideoClientConfig = { 
    region: awsConfig.region,
    credentials: {
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey,
    } 
};
const kinesisVideoClient = new KinesisVideoClient(kinesisVideoClientConfig);

interface StartViewerInput {
    channelName: string;
    natTraversal: NatTraversal,
    widescreen: boolean;
    sendVideo: boolean;
    sendAudio: boolean;
    useTrickleICE: boolean;
}

export const startViewer = async (params: StartViewerInput) => {    
    // 以下を参考にする
    // https://github.com/awslabs/amazon-kinesis-video-streams-webrtc-sdk-js#usage
    viewer.localView = document.getElementById('local-video');
    viewer.remoteView = document.getElementById('remote-video');

    // Get signaling channel ARN
    const describeSignalingChannelCommand = new DescribeSignalingChannelCommand({
        ChannelName: params.channelName,
    })
    const describeSignalingChannelResponse: DescribeSignalingChannelCommandOutput = await kinesisVideoClient.send(describeSignalingChannelCommand);
    if (!describeSignalingChannelResponse.ChannelInfo!.ChannelARN) {
        throw new Error('Failed in describe channelinfo.');
    }
    const channelARN: string = describeSignalingChannelResponse.ChannelInfo!.ChannelARN;
    console.log('[VIEWER] Channel ARN: ', channelARN);

    // Get signaling channel endpoints
    const getSignalingChannelEndpointCommandInput: GetSignalingChannelEndpointCommandInput = {
        ChannelARN: channelARN,
        SingleMasterChannelEndpointConfiguration: {
            Protocols: ['WSS', 'HTTPS'],
            Role: ChannelRole.VIEWER,
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
    console.log('[VIEWER] Endpoints: ', endpointsByProtocol);

    // Create Signaling Client
    viewer.signalingClient = new SignalingClient({
        channelARN,
        channelEndpoint: endpointsByProtocol.WSS,
        clientId: Uuid(),
        role: Role.VIEWER,
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
    console.log('[VIEWER] ICE servers: ', iceServers);

    const resolution = params.widescreen ? { width: { ideal: 1280 }, height: { ideal: 720 } } : { width: { ideal: 640 }, height: { ideal: 480 } };
    const constraints = {
        video: params.sendVideo ? resolution : false,
        audio: params.sendAudio,
    };

    const configuration: RTCConfiguration = {
        iceServers,
        iceTransportPolicy: params.natTraversal === 'TURN' ? 'relay' : 'all',
    };
    viewer.peerConnection = new RTCPeerConnection(configuration) as EventTarget;

    // コメント機能実装時に追加!!
    // if (params.openDataChannel) {
    //     viewer.dataChannel = viewer.peerConnection.createDataChannel('kvsDataChannel');
    //     viewer.peerConnection.ondatachannel = event => {
    //         event.channel.onmessage = onRemoteDataMessage;
    //     };
    // }

    // Poll for connection stats
    viewer.peerConnectionStatsInterval = setInterval(() => viewer.peerConnection.getStats().then(), 1000);

    viewer.signalingClient.on('open', async () => {
        console.log('[VIEWER] Connected to signaling service');

        // Get a stream from the webcam, add it to the peer connection, and display it in the local view.
        // If no video/audio needed, no need to request for the sources. 
        // Otherwise, the browser will throw an error saying that either video or audio has to be enabled.
        if (params.sendVideo || params.sendAudio) {
            try {
                viewer.localStream = await navigator.mediaDevices.getUserMedia(constraints);
                viewer.localStream.getTracks().forEach((track: MediaStreamTrack) => viewer.peerConnection.addTrack(track, viewer.localStream));
                viewer.localView.srcObject = viewer.localStream;
                viewer.localView.play().catch((error: unknown) => console.log(error))
            } catch (e) {
                console.error('[VIEWER] Could not find webcam');
                return;
            }
        }

        // Create an SDP offer to send to the master
        console.log('[VIEWER] Creating SDP offer');
        await viewer.peerConnection.setLocalDescription(
            await viewer.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            }),
        );

        // When trickle ICE is enabled, send the offer now and then send ICE candidates as they are generated. Otherwise wait on the ICE candidates.
        if (params.useTrickleICE) {
            console.log('[VIEWER] Sending SDP offer');
            viewer.signalingClient.sendSdpOffer(viewer.peerConnection.localDescription);
        }
        console.log('[VIEWER] Generating ICE candidates');
    });

    viewer.signalingClient.on('sdpAnswer', async (answer: RTCSessionDescriptionInit) => {
        // Add the SDP answer to the peer connection
        console.log('[VIEWER] Received SDP answer');
        await viewer.peerConnection.setRemoteDescription(answer);
    });

    viewer.signalingClient.on('iceCandidate', (candidate: string) => {
        // Add the ICE candidate received from the MASTER to the peer connection
        console.log('[VIEWER] Received ICE candidate');
        viewer.peerConnection.addIceCandidate(candidate);
    });

    viewer.signalingClient.on('close', () => {
        console.log('[VIEWER] Disconnected from signaling channel');
    });

    viewer.signalingClient.on('error', (error: unknown) => {
        console.error('[VIEWER] Signaling client error: ', error);
    });

    // Send any ICE candidates to the other peer
    // @ts-ignore
    viewer.peerConnection.addEventListener('icecandidate', ({ candidate }) => {
        if (candidate) {
            console.log('[VIEWER] Generated ICE candidate');

            // When trickle ICE is enabled, send the ICE candidates as they are generated.
            if (params.useTrickleICE) {
                console.log('[VIEWER] Sending ICE candidate');
                viewer.signalingClient.sendIceCandidate(candidate);
            }
        } else {
            console.log('[VIEWER] All ICE candidates have been generated');

            // When trickle ICE is disabled, send the offer now that all the ICE candidates have ben generated.
            if (!params.useTrickleICE) {
                console.log('[VIEWER] Sending SDP offer');
                viewer.signalingClient.sendSdpOffer(viewer.peerConnection.localDescription);
            }
        }
    });

    // As remote tracks are received, add them to the remote view
    viewer.peerConnection.addEventListener('track', (event: RTCTrackEvent) => {
        console.log('[VIEWER] Received remote track');
        if (viewer.remoteView.srcObject) {
            return;
        }
        viewer.remoteStream = event.streams[0];
        viewer.remoteView.srcObject = viewer.remoteStream;
        viewer.remoteView.play().catch((error: unknown) => console.log(error))
    });

    console.log('[VIEWER] Starting viewer connection');
    viewer.signalingClient.open();
}

export const stopViewer = () => {
    console.log('[VIEWER] Stopping viewer connection');
    if (viewer.signalingClient) {
        viewer.signalingClient.close();
        viewer.signalingClient = null;
    }

    if (viewer.peerConnection) {
        viewer.peerConnection.close();
        viewer.peerConnection = null;
    }

    if (viewer.localStream) {
        viewer.localStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        viewer.localStream = null;
    }

    if (viewer.remoteStream) {
        viewer.remoteStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        viewer.remoteStream = null;
    }

    if (viewer.peerConnectionStatsInterval) {
        clearInterval(viewer.peerConnectionStatsInterval);
        viewer.peerConnectionStatsInterval = null;
    }

    if (viewer.localView) {
        viewer.localView.srcObject = null;
    }

    if (viewer.remoteView) {
        viewer.remoteView.srcObject = null;
    }

    if (viewer.dataChannel) {
        viewer.dataChannel = null;
    }
}

// メッセージ送信機能が必要になったら利用する
// const sendViewerMessage = (message: string) => {
//     if (viewer.dataChannel) {
//         try {
//             viewer.dataChannel.send(message);
//         } catch (e: unknown) {
//             console.error('[VIEWER] Send DataChannel: ', JSON.stringify(e));
//         }
//     }
// }
