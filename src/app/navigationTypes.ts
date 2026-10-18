import type { RouteProp } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type { MediaCategory } from '@core/storage/types';

export interface FileListRouteParams {
  folderId: string;
  folderPath: string;
  folderName: string;
  category: MediaCategory;
}

export type RootStackParamList = {
  Dashboard: undefined;
  FolderExplorer: {
    category: MediaCategory;
  };
  FileListScreen: FileListRouteParams;
  FileList?: FileListRouteParams;
  PermissionGatekeeper?: undefined;
};

export type AppNavigatorParamList = RootStackParamList;

export type DashboardScreenProps = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;
export type FolderExplorerScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'FolderExplorer'
>;
export type FileListScreenProps = NativeStackScreenProps<RootStackParamList, 'FileListScreen'>;
export type PermissionGatekeeperScreenRouteProps = NativeStackScreenProps<
  RootStackParamList,
  'PermissionGatekeeper'
>;

export type DashboardNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
export type FolderExplorerNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'FolderExplorer'
>;
export type FileListNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'FileListScreen'
>;

export type FolderExplorerRouteProp = RouteProp<RootStackParamList, 'FolderExplorer'>;
export type FileListRouteProp = RouteProp<RootStackParamList, 'FileListScreen'>;
