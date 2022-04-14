import { Fragment, useState } from 'react';
import { createSignalingChannel } from './createSignalChannel';
import { startMaster, stopMaster } from './Master';
import { startViewer, stopViewer } from './Viewer';
import Container from '@mui/material/Container';

import { 
  Button,
  ButtonGroup,
  Checkbox,
  FormControl,
  FormGroup,
  FormControlLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField
} from '@mui/material';

const VideoResolution = {
  WIDESCREEN: 'WIDESCREEN',
  FULLSCREEN: 'FULLSCREEN'
};

export type NatTraversal = 'STUN/TURN' | 'TURN' | 'DISABLED';


export const MyForm = () => {
  const [ channelName, setChannelName ] = useState('');
  const [ isVideoSend, setIsVideoSend ] = useState(false);
  const [ isAudioSend, setIsAudioSend ] = useState(false);
  const [ videoResolution, setVideoResolution ] = useState(VideoResolution.WIDESCREEN);
  const [ natTraversal, setNatTraversal ] = useState<NatTraversal>('STUN/TURN');
  const [ useTrickleICE, setUseTrickleICE ] = useState(true);

  const handleSetVideoResolution = (e: SelectChangeEvent) => {
    setVideoResolution(e.target.value);
  }

  const handleSetNATTraversal = (e: SelectChangeEvent) => {
    setNatTraversal(e.target.value as NatTraversal);
  }

  return (
    <Fragment>
      <form action="">
        <Container component="main" maxWidth="xs">
        <h2>ChannelName</h2>
          <TextField
            id="SignalingChannelName"
            placeholder="yourSignalingChannelName"
            value={channelName}
            onChange={(event) => {setChannelName(event.target.value)}}
          />

        <h2>Tracks</h2>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isVideoSend} 
                  onChange={(event) => {setIsVideoSend(event.target.checked)}}
                />
              }
              label = 'Send Video' 
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={isAudioSend} 
                  onChange={(event) => {setIsAudioSend(event.target.checked)}}
                />
              }
              label = 'Send Audio' 
            />
          </FormGroup>

        <h2>Video Resolution</h2>
          <FormControl sx={{ m: 1, minWidth: 80 }}>
            <Select
              value={videoResolution}
              onChange={handleSetVideoResolution}
              autoWidth
            >
              <MenuItem value={VideoResolution.WIDESCREEN}>1280x720 (16:9 widescreen)</MenuItem>
              <MenuItem value={VideoResolution.FULLSCREEN}>640x480 (4:3 fullscreen)</MenuItem>
            </Select>
          </FormControl>

        <h2>NAT Traversal</h2>
          <FormControl sx={{ m: 1, minWidth: 120 }}>
            <Select
              value={natTraversal}
              onChange={handleSetNATTraversal}
              autoWidth
              label="NATTraversal"
            >
              <MenuItem value={'STUN/TURN'}>STUN/TURN</MenuItem>
              <MenuItem value={'TURN'}>TURN</MenuItem>
              <MenuItem value={'DISABLED'}>DISABLED</MenuItem>
            </Select>
          </FormControl>

        <h2>Use trickle ICE...?</h2>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={useTrickleICE} 
                  onChange={(event) => {setUseTrickleICE(event.target.checked)}}
                />
              }
              label = 'Yes! (not supported by Alexa devices)' 
            />
          </FormGroup>

        <h2>Start!!!</h2>  
          <ButtonGroup variant="contained" aria-label="outlined primary button group">
          <Button
            disabled={(isVideoSend || isAudioSend) && !channelName}
            onClick={() => {startMaster({
              channelName: channelName,
              natTraversal: natTraversal,
              widescreen: videoResolution === 'WIDESCREEN',
              sendVideo: isVideoSend,
              sendAudio: isAudioSend,
              useTrickleICE: useTrickleICE,
          })}} 
          >
            Start Master
          </Button>
          <Button
            disabled={(isVideoSend || isAudioSend) && !channelName}
            onClick={() => {startViewer({
              channelName: channelName,
              natTraversal: natTraversal,
              widescreen: videoResolution === 'WIDESCREEN',
              sendVideo: isVideoSend,
              sendAudio: isAudioSend,
              useTrickleICE: useTrickleICE,
          })}}
          >
            Start Viewer
          </Button>
          <Button
            disabled={!channelName}
            onClick={() => {createSignalingChannel(channelName)}}
          >
            Create Channnel
          </Button>
          </ButtonGroup>

          <h2>Stop!!!</h2>  
          <ButtonGroup variant="contained" aria-label="outlined primary button group">
          <Button
            onClick={() => {stopMaster()}} 
          >
            Stop Master
          </Button>
          <Button
            onClick={() => {stopViewer()}}
          >
            Stop Viewer
          </Button>
          </ButtonGroup>          
        </Container>
      </form>
      <br />
      <div>
        <h4>remote</h4>
          <video id='remote-video' width="480px" height="360px" style={{color: 'black', border: 'solid'}}></video>
        <h4>local</h4>
          <video id='local-video' width="240px" height="180px" style={{color: 'black', border: 'solid'}}></video>
      </div>
    </Fragment>
  );
};
