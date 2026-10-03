import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { PressableScale } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { Avatar } from '@/shared/ui/Avatar';
import { Icon } from '@/shared/ui/Icon';
import { colors } from '@/theme';
import { useAvatarUpload } from '../hooks/useAvatarUpload';

export interface ProfileHeaderProps {
  avatar: string;
  avatarUrl?: string | null;
  name: string;
  subtitle: string;
}

/** Шапка профілю: аватар (тап → своє фото з галереї, як у макеті), ім'я та підпис */
export function ProfileHeader({ avatar, avatarUrl, name, subtitle }: ProfileHeaderProps) {
  const { t } = useTranslation();
  const upload = useAvatarUpload();
  return (
    <View style={styles.row}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('profile.changePhoto')}
        onPress={() => upload.mutate()}
        disabled={upload.isPending}
        haptic
      >
        <Avatar symbol={avatar} uri={avatarUrl} size={62} tone="dark" />
        <View style={styles.badge}>
          {upload.isPending ? <ActivityIndicator size="small" color={colors.white} /> : <Icon name="camera" size={14} color="white" />}
        </View>
      </PressableScale>
      <View style={styles.texts}>
        <AppText variant="h3" numberOfLines={2}>{name}</AppText>
        <AppText variant="small" color="muted">{subtitle}</AppText>
        {upload.isError ? <AppText variant="caption" color="red">{t(`errors.${upload.error.code}`)}</AppText> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  badge: { position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.greenButton, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  texts: { flex: 1, gap: 2 },
});
