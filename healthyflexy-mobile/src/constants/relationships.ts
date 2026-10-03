import { RelationshipType } from '@/types';

export const RELATIONSHIPS: readonly RelationshipType[] = [
  RelationshipType.Mom,
  RelationshipType.Dad,
  RelationshipType.Grandma,
  RelationshipType.Grandpa,
  RelationshipType.Other,
];

/** Рід для форм слів у текстах: f — мама/бабуся, m — тато/дідусь, n — нейтрально */
export const RELATIONSHIP_GENDER: Record<RelationshipType, 'f' | 'm' | 'n'> = {
  [RelationshipType.Mom]: 'f',
  [RelationshipType.Grandma]: 'f',
  [RelationshipType.Dad]: 'm',
  [RelationshipType.Grandpa]: 'm',
  [RelationshipType.Other]: 'n',
};

/** Емодзі-аватар батька/матері за тим, ким він є для дитини (ТЗ §6.2: 👵 / 👴) */
export const PARENT_AVATAR: Record<RelationshipType, string> = {
  [RelationshipType.Mom]: '👵',
  [RelationshipType.Grandma]: '👵',
  [RelationshipType.Dad]: '👴',
  [RelationshipType.Grandpa]: '👴',
  [RelationshipType.Other]: '🧑',
};

export const CHILD_AVATAR = '🧑';
