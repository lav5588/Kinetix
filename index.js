/**
 * @format
 */

import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import App from '@app';
import { playbackService } from '@features/audioPlayer/services/playbackService';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
TrackPlayer.registerPlaybackService(() => playbackService);

