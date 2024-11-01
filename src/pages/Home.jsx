import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCookies } from "react-cookie";
import axios from "axios";
import { Header } from "../components/Header";
import { url } from "../const";
import "./home.scss";

// 残り時間を計算して表示用の文字列を返す関数
const getRemainingTime = (dateString) => {
  if (!dateString) return "";

  const now = new Date();
  const deadline = new Date(dateString);
  const diffTime = deadline - now;

  // 期限切れの場合
  if (diffTime < 0) {
    return "期限切れ";
  }

  // 残り時間を計算
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(
    (diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));

  // 表示文字列を作成
  if (diffDays > 0) {
    return `残り ${diffDays}日 ${diffHours}時間`;
  } else if (diffHours > 0) {
    return `残り ${diffHours}時間 ${diffMinutes}分`;
  } else if (diffMinutes > 0) {
    return `残り ${diffMinutes}分`;
  } else {
    return "まもなく期限";
  }
};

export const Home = () => {
  const [isDoneDisplay, setIsDoneDisplay] = useState("todo"); // todo->未完了 done->完了
  const [lists, setLists] = useState([]);
  const [selectListId, setSelectListId] = useState();
  const [tasks, setTasks] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [cookies] = useCookies();
  const handleIsDoneDisplayChange = (e) => setIsDoneDisplay(e.target.value);

  // 日時のフォーマット用の関数
  const formatDateTime = (dateString) => {
    if (!dateString) return "期限なし";
    const date = new Date(dateString);
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    axios
      .get(`${url}/lists`, {
        headers: {
          authorization: `Bearer ${cookies.token}`,
        },
      })
      .then((res) => {
        setLists(res.data);
      })
      .catch((err) => {
        setErrorMessage(`リストの取得に失敗しました。${err}`);
      });
  }, []);

  useEffect(() => {
    const listId = lists[0]?.id;
    if (typeof listId !== "undefined") {
      setSelectListId(listId);
      axios
        .get(`${url}/lists/${listId}/tasks`, {
          headers: {
            authorization: `Bearer ${cookies.token}`,
          },
        })
        .then((res) => {
          setTasks(res.data.tasks);
        })
        .catch((err) => {
          setErrorMessage(`タスクの取得に失敗しました。${err}`);
        });
    }
  }, [lists]);

  const handleSelectList = (id, event) => {
    if (
      event.type === "click" ||
      (event.type === "keydown" && event.key === "Enter")
    ) {
      setSelectListId(id);
      axios
        .get(`${url}/lists/${id}/tasks`, {
          headers: {
            authorization: `Bearer ${cookies.token}`,
          },
        })
        .then((res) => {
          setTasks(res.data.tasks);
        })
        .catch((err) => {
          setErrorMessage(`タスクの取得に失敗しました。${err}`);
        });
    }
  };
  return (
    <div>
      <Header />
      <main className="taskList">
        <p className="error-message">{errorMessage}</p>
        <div aria-label="リスト一覧">
          <div className="list-header">
            <h2 id="list-heading">リスト一覧</h2>
            <div className="list-menu" aria-label="リスト操作メニュー">
              <p>
                <Link to="/list/new">リスト新規作成</Link>
              </p>
              <p>
                <Link to={`/lists/${selectListId}/edit`}>
                  選択中のリストを編集
                </Link>
              </p>
            </div>
          </div>
          <ul className="list-tab" aria-labelledby="list-heading">
            {lists.map((list, key) => {
              const isActive = list.id === selectListId;
              return (
                <li
                  key={key}
                  className={`list-tab-item ${isActive ? "active" : ""}`}
                  onClick={(event) => handleSelectList(list.id, event)}
                  onKeyDown={(event) => handleSelectList(list.id, event)}
                  aria-selected={isActive}
                  tabIndex="0" // この行を追加
                >
                  {list.title}
                </li>
              );
            })}
          </ul>
          <div className="tasks">
            <div className="tasks-header">
              <h2>タスク一覧</h2>
              <Link to="/task/new">タスク新規作成</Link>
            </div>
            <div className="display-select-wrapper">
              <select
                onChange={handleIsDoneDisplayChange}
                className="display-select"
              >
                <option value="todo">未完了</option>
                <option value="done">完了</option>
              </select>
            </div>
            <Tasks
              tasks={tasks}
              selectListId={selectListId}
              isDoneDisplay={isDoneDisplay}
              formatDateTime={formatDateTime}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

// 表示するタスク
const Tasks = (props) => {
  const { tasks, selectListId, isDoneDisplay, formatDateTime } = props;
  if (tasks === null) return <></>;

  const renderTask = (task, key) => {
    const remainingTime = task.limit ? getRemainingTime(task.limit) : "";
    const isOverdue = task.limit && new Date(task.limit) < new Date();

    return (
      <li key={key} className="task-item">
        <Link
          to={`/lists/${selectListId}/tasks/${task.id}`}
          className="task-item-link"
        >
          <div className="task-title">{task.title}</div>
          <div className="task-info">
            <span className="task-status">{task.done ? "完了" : "未完了"}</span>
            <br />
            <span className="task-deadline">
              期限: {formatDateTime(task.limit)}
            </span>
            <br />
            {task.limit && (
              <span className={`task-remaining ${isOverdue ? "overdue" : ""}`}>
                {remainingTime}
              </span>
            )}
          </div>
        </Link>
      </li>
    );
  };

  if (isDoneDisplay === "done") {
    return (
      <ul>
        {tasks
          .filter((task) => task.done === true)
          .map((task, key) => renderTask(task, key))}
      </ul>
    );
  }

  return (
    <ul>
      {tasks
        .filter((task) => task.done === false)
        .map((task, key) => renderTask(task, key))}
    </ul>
  );
};
