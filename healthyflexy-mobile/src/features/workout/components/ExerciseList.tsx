import { Card } from '@/shared/ui/Card';
import type { TodayExercise } from '@/types';
import { ExerciseCard } from './ExerciseCard';

export interface ExerciseListProps {
  exercises: TodayExercise[];
  onSelect: (exercise: TodayExercise) => void;
}

/** Білий блок зі списком вправ на сьогодні (вправи відкриваються послідовно — станом керує сервер) */
export function ExerciseList({ exercises, onSelect }: ExerciseListProps) {
  return (
    <Card flush>
      {exercises.map((exercise, index) => (
        <ExerciseCard
          key={exercise.exerciseId}
          exercise={exercise}
          onPress={onSelect}
          isLast={index === exercises.length - 1}
          index={index}
        />
      ))}
    </Card>
  );
}
