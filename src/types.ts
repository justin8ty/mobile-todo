export type Todo = {
  id: number;
  userId: number;
  title: string;
  completed: boolean;
};

export function isTodo(value: unknown): value is Todo {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    Number.isInteger(value.id) &&
    'userId' in value &&
    Number.isInteger(value.userId) &&
    'title' in value &&
    typeof value.title === 'string' &&
    'completed' in value &&
    typeof value.completed === 'boolean'
  );
}

export function isTodoList(value: unknown): value is Todo[] {
  return Array.isArray(value) && value.every(isTodo);
}
