import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';

/**
 * «Назад» на кроці реєстрації. Кроки переходять через `router.replace` (стан визначає, який крок показати),
 * тому історії навігації немає — кожен крок сам знає, куди повертатися, і відкочує свій стан.
 * Системна кнопка «Назад» Android робить те саме (інакше вона просто закривала б застосунок).
 */
export function useStepBack(goBack: () => void): () => void {
  const ref = useRef(goBack);
  useEffect(() => {
    ref.current = goBack;
  }, [goBack]);
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        ref.current();
        return true;
      });
      return () => sub.remove();
    }, []),
  );
  return useCallback(() => ref.current(), []);
}
