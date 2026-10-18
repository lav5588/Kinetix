import type { RouteProp } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type { MediaCategory } from '@core/storage/types';

export type RootStackParamList = {
  Dashboard: undefined;
  FolderExplorer: {
    category: MediaCategory;
  };
  PermissionGatekeeper?: undefined;
};

export type AppNavigatorParamList = RootStackParamList;

export type DashboardScreenProps = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;
export type FolderExplorerScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'FolderExplorer'
>;
export type PermissionGatekeeperScreenRouteProps = NativeStackScreenProps<
  RootStackParamList,
  'PermissionGatekeeper'
>;

export type DashboardNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
export type FolderExplorerNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'FolderExplorer'
>;

export type FolderExplorerRouteProp = RouteProp<RootStackParamList, 'FolderExplorer'>;
