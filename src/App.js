import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { HubConnectionBuilder } from "@microsoft/signalr";
import './App.css';

function App() {
	const [connection, setConnection] = useState(null);
	const [isConnected, setIsConnected] = useState(false);
	const [tasks, setTasks] = useState([]);
	const [newTask, setNewTask] = useState("");

	useEffect(() => {
		const newConnection = new HubConnectionBuilder()
			.withUrl("https://2dolistbackend.azurewebsites.net/taskhub")
			.withAutomaticReconnect()
			.build();

		setConnection(newConnection);
	}, []);

	useEffect(() => {
		if (connection) {
			connection.start()
				.then(() => {
					setIsConnected(true);

					connection.on('ReceiveTasks', tasks => {
						setTasks(JSON.parse(tasks));
					});
				})
				.catch(e => console.error('Connection failed: ', e));
		}
	}, [connection]);

	useEffect(() => {
		const storedTasks = localStorage.getItem("tasks");
		if (storedTasks) {
			setTasks(JSON.parse(storedTasks));
		}
	}, []);

	const handleAddTask = () => {
		if (newTask.trim()) {
			const updatedTasks = [...tasks, newTask.trim()];
			localStorage.setItem("tasks", JSON.stringify(updatedTasks));
			if (connection && isConnected) {
				connection.send("TaskAdded", newTask.trim());
			}
			setTasks(updatedTasks);
			setNewTask("");
		}
	};

	const handleEditTask = (index) => {
		const updatedTask = prompt("Edit your task:", tasks[index]);
		if (updatedTask && updatedTask !== tasks[index]) {
			const updatedTasks = [...tasks];
			updatedTasks[index] = updatedTask;
			localStorage.setItem("tasks", JSON.stringify(updatedTasks));
			if (connection && isConnected) {
				connection.send("TaskEdited", tasks[index], updatedTask);
			}
			setTasks(updatedTasks);
		}
	};

	const handleDeleteTask = (index) => {
		const updatedTasks = tasks.filter((_, i) => i !== index);
		localStorage.setItem("tasks", JSON.stringify(updatedTasks));
		if (connection && isConnected) {
			connection.send("TaskDeleted", tasks[index]);
		}
		setTasks(updatedTasks);
	};

	const handleOnDragEnd = (result) => {
		if (!result.destination) return;

		const items = Array.from(tasks);
		const [reorderedItem] = items.splice(result.source.index, 1);
		items.splice(result.destination.index, 0, reorderedItem);
		localStorage.setItem("tasks", JSON.stringify(items));

		if (connection && isConnected) {
			connection.send("TaskMoved", items);
		}

		setTasks(items);
	};

	return (
		<div className="container">
			<h1>ToDo List</h1>
			<div className="input-group">
				<input
					type="text"
					value={newTask}
					onChange={(e) => setNewTask(e.target.value)}
					placeholder="Add a new task..."
				/>
				<button onClick={handleAddTask}>Add Task</button>
			</div>
			<DragDropContext onDragEnd={handleOnDragEnd}>
				<Droppable droppableId="tasks">
					{(provided) => (
						<ul {...provided.droppableProps} ref={provided.innerRef}>
							{tasks.map((task, index) => (
								<Draggable key={task} draggableId={task} index={index}>
									{(provided) => (
										<li
											{...provided.draggableProps}
											{...provided.dragHandleProps}
											ref={provided.innerRef}
										>
											<span>{task}</span>
											<button onClick={() => handleEditTask(index)}>Edit</button>
											<button onClick={() => handleDeleteTask(index)}>Delete</button>
										</li>
									)}
								</Draggable>
							))}
							{provided.placeholder}
						</ul>
					)}
				</Droppable>
			</DragDropContext>
		</div>
	);
}

export default App;
