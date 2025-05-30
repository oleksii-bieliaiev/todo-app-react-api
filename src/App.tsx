import React, {
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import classNames from 'classnames';
import { AuthContext } from './components/Auth/AuthContext';
import { Condition } from './types/Condition';
import { Todo } from './types/Todo';
import {
  addTodos,
  deleteTodos,
  getTodos,
  updateTodos,
} from './api/todos';
import { TodoList } from './components/TodoList';
import { Footer } from './components/Footer';
import { ErrorNotification } from './components/ErrorNotification';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState(Condition.All);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [activeLoading, setActiveLoading] = useState<number[]>([]);
  const [loader, setLoader] = useState<number>(0);
  const [idToUpdate, setIdToUpdate] = useState<number>(0);
  const [isTotalTick, setIsTotalTick] = useState(false);

  const user = useContext(AuthContext);
  const newTodoField = useRef<HTMLInputElement>(null);

  const filteredTodos = todos.filter(todo => {
    switch (filterType) {
      case Condition.Active:
        return !todo.completed;
      case Condition.Completed:
        return todo.completed;
      default:
        return Condition.All;
    }
  });

  const loadApiTodos = async () => {
    if (user) {
      try {
        const data = await getTodos(user.id);

        setTodos(data);
      } catch {
        setError('Unable to add a todo');
      }
    }
  };

  useEffect(() => {
    if (newTodoField.current) {
      newTodoField.current.focus();
    }

    loadApiTodos();
  }, []);

  const changeFilterType = (event: Condition) => {
    setFilterType(event);
  };

  const closeError = () => {
    setError('');
  };

  const addToLoadingArr = (id: number) => {
    setActiveLoading(arr => [...arr, id]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    if (!newTodoTitle.trim()) {
      setError('Title can\'t be empty');

      return;
    }

    if (newTodoTitle.length) {
      try {
        const newTodo = {
          userId: user.id,
          title: newTodoTitle,
          completed: false,
        };

        const data = await addTodos(newTodo);

        setLoader(data.id);
        setIsAdding(true);
        setNewTodoTitle('');
        loadApiTodos();
      } catch {
        setError('Unable to add a todo');
        setNewTodoTitle('');
      } finally {
        setIsAdding(false);
      }
    }
  };

  useEffect(() => {
    const timerForAdding = setTimeout(() => {
      setLoader(0);
    }, 300);

    return () => clearTimeout(timerForAdding);
  });

  const handleDeleteTodo = async (todoId: number) => {
    addToLoadingArr(todoId);
    try {
      await deleteTodos(todoId);
      loadApiTodos();
    } catch {
      setError('Unable to delete a todo');
    }
  };

  useEffect(() => {
    const timerForDelete = setTimeout(() => {
      setActiveLoading([]);
    }, 300);

    return () => clearTimeout(timerForDelete);
  });

  const tickTodo = async (id: number, completed: boolean) => {
    setIdToUpdate(id);

    try {
      await updateTodos({
        id,
        completed: !completed,
      });
      loadApiTodos();
    } catch {
      setError('Unable to update a todo');
    }

    setIdToUpdate(0);
  };

  const updateTodoTitle = async (
    id: number, title: string,
  ) => {
    setIdToUpdate(id);

    try {
      await updateTodos({
        id,
        title,
      });
      loadApiTodos();
    } catch {
      setError('Unable to update a todo');
    }

    setError('');
    setIdToUpdate(0);
  };

  const todosNotCompleted = todos.filter(todo => !todo.completed);

  const todosToTick = todosNotCompleted.length > 0
    ? todosNotCompleted
    : todos;

  const tickAllTodos = async () => {
    setIsTotalTick(true);

    try {
      await Promise.all(todosToTick.map(({ id, completed }) => (
        tickTodo(id, completed)
      )));
    } catch {
      setError('Unable to update a todo');
    }

    setIsTotalTick(false);
  };

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {todos.length > 0 && (
            <button
              data-cy="ToggleAllButton"
              type="button"
              aria-label="toggle-button"
              className={classNames('todoapp__toggle-all', {
                active: todosNotCompleted.length === 0,
              })}
              onClick={tickAllTodos}
            />
          )}

          <form onSubmit={handleSubmit}>
            <input
              data-cy="NewTodoField"
              type="text"
              ref={newTodoField}
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              disabled={isAdding}
              value={newTodoTitle}
              onChange={(event) => setNewTodoTitle(event.target.value)}
            />
          </form>
        </header>

        {todos.length > 0 && (
          <>
            <TodoList
              todos={filteredTodos}
              onDelete={handleDeleteTodo}
              activeLoading={activeLoading}
              isAdding={isAdding}
              loader={loader}
              tickTodo={tickTodo}
              idToUpdate={idToUpdate}
              updateTodoTitle={updateTodoTitle}
              isTotalTick={isTotalTick}
            />
            <Footer
              todos={todos}
              setFilterType={changeFilterType}
              onDelete={handleDeleteTodo}
              filterType={filterType}
            />
          </>
        )}
      </div>

      {error && (
        <ErrorNotification
          error={error}
          setError={closeError}
        />
      )}
    </div>
  );
};
