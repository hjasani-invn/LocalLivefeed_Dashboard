

"""new code for marker - MARKER on display"""

import os
import shutil
import threading
import pandas as pd
from queue import Queue
from flask import Flask, render_template, jsonify
from flask_socketio import SocketIO
import time
import xml.etree.ElementTree as ET



DATA_DIR = 'C:\\Users\\hjasani\\Downloads\\LocalDashBoard_2\\LiveFeedLocalDashBoard\\static\\data'  # Update with your directory path
OUTPUT_DIR = 'C:\\Users\\hjasani\\Downloads\\LocalDashBoard_2\\LiveFeedLocalDashBoard\\static\\data\\output'

# Clear and recreate the output directory at the start of the application
shutil.rmtree(OUTPUT_DIR, ignore_errors=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)


app = Flask(__name__)
socketio = SocketIO(app)

latitude = 0
longitude = 0
floor_number = 0

# Create a dictionary to store user lines count for each CSV file
user_lines_count = {}
output_queue = Queue()
selected_floor = None
# selected_users = []
# floor_mapping = {"F1": 2, "F2": 3, "F3": 4}  # Add more mappings as needed



@app.route('/')
def index():
    return render_template('index.html')


# Route for the assets page
@app.route('/assets')
def assets():
    return render_template('assets.html')


@app.route('/available-files')
def available_files():
    files = [f for f in os.listdir(DATA_DIR) if f.endswith('.csv')]
    return jsonify(files)


def read_csv_txt_file(file_name, output_queue, delimiter=' '):
    file_path = os.path.join(DATA_DIR, file_name)
    start_time = time.time()

    try:
        # Try reading as CSV
        df = pd.read_csv(file_path, header=None)
        columns_info = "Columns: {}, Delimiter: ,".format(df.shape[1])
        print(f"File: {file_name}, {columns_info}")

    except pd.errors.ParserError:
        try:
            # Try reading as TXT with the specified delimiter
            df = pd.read_csv(file_path, header=None, delimiter=delimiter)
            columns_info = "Columns: {}, Delimiter:        ".format(df.shape[1])
            print(f"File: {file_name}, {columns_info}")

        except pd.errors.ParserError:
            print(f"Error reading file: {file_name}")
            return

    if df.shape[1] >= 11:
        # Select columns 7, 8, and 11 (adjust indices as needed)
        selected_columns = df.iloc[:, [7, 8, 11]]

        # Put the processed data in the queue
        for i, row in enumerate(selected_columns.values.tolist()):
            output_queue.put((file_name, row, start_time, time.time()))

    else:
        print(f"File: {file_name} does not have enough columns.")



def save_to_output_file(file_name, data):



    output_file_name = f"{file_name.replace('.csv', '_output.csv')}"
    output_file_path = os.path.join(OUTPUT_DIR, output_file_name)


    # Ensure the directory exists
    os.makedirs(os.path.dirname(output_file_path), exist_ok=True)


    with open(output_file_path, 'a') as output_file:
        output_file.write(','.join(map(str, data)) + '\n')





# def emit_values():
#     global latitude, longitude, floor_number, user_lines_count
#     while True:
#         data = output_queue.get()
#         if data is None:
#             break
#         file_name, row, start_time, current_time = data
#
#         # Replace these values with the actual values from your CSV file or COMM port
#         latitude, longitude, floor_number = row
#
#         # Emit values to the connected clients
#         socketio.emit('update_values', {'latitude': latitude, 'longitude': longitude, 'floorNumber': floor_number})
#
#         # Update user lines count for the specific CSV file
#         user_lines_count[file_name] = user_lines_count.get(file_name, 0) + 1
#
#
#         # Emit user lines count for each CSV file
#         socketio.emit('update_users_info', {'users': user_lines_count})
#
#
#         # Count total number of files
#         total_files = len([f for f in os.listdir(DATA_DIR) if os.path.isfile(os.path.join(DATA_DIR, f))])
#         # print(f"---------Total files: {total_files}---------")
#         # print(type(total_files))
#         # Emit user lines count and the total number of users
#         socketio.emit('update_users_info_for_checklist', {'totalFiles': total_files})
#
#
#
#         # Save to output file
#         save_to_output_file(file_name, row)
#
#         # map['latitude'] = latitude
#         # map['longitude'] = longitude
#         # map['floorNumber'] = floor_number
#         # socketio.emit('update_map', {'map': map})
#
#         # Introduce a delay to slow down updates
#         time.sleep(0.01)
#
#         # Update map separately
#         map_data = {'latitude': latitude, 'longitude': longitude, 'floorNumber': floor_number}
#         socketio.emit('update_map', {'map': map_data})
#         # print(f"Sending update - Latitude: {latitude}, Longitude: {longitude}, Floor Number: {floor_number}")



# def emit_values():
#     global latitude, longitude, floor_number, user_lines_count, selected_floor, selected_users
#     while True:
#         data = output_queue.get()
#         if data is None:
#             break
#         file_name, row, start_time, current_time = data
#         latitude, longitude, floor_number = row
#
#         if selected_floor is not None and selected_users and floor_mapping[selected_floor] == floor_number:
#             # Emit values only if the selected floor and user are chosen
#             socketio.emit('update_values', {'latitude': latitude, 'longitude': longitude, 'floorNumber': floor_number})
#             user_lines_count[file_name] = user_lines_count.get(file_name, 0) + 1
#             socketio.emit('update_users_info', {'users': user_lines_count})
#
#             # Save to output file
#             save_to_output_file(file_name, row)
#
#             # Update map separately
#             map_data = {'latitude': latitude, 'longitude': longitude, 'floorNumber': floor_number}
#             socketio.emit('update_map', {'map': map_data})
#
#         time.sleep(0.01)




def emit_values():
    global latitude, longitude, floor_number, user_lines_count
    while True:
        data = output_queue.get()
        if data is None:
            break
        file_name, row, start_time, current_time = data

        # Replace these values with the actual values from your CSV file or COMM port
        latitude, longitude, floor_number = row

        # Emit values to the connected clients
        socketio.emit('update_values', {'latitude': latitude, 'longitude': longitude, 'floorNumber': floor_number},
                      callback=log_ack('update_values', data))

        # Update user lines count for the specific CSV file
        user_lines_count[file_name] = user_lines_count.get(file_name, 0) + 1

        # Emit user lines count for each CSV file
        socketio.emit('update_users_info', {'users': user_lines_count},
                      callback=log_ack('update_users_info', {'users': user_lines_count, 'file_name': file_name}))
        # # Emit user lines count for each CSV file
        # socketio.emit('update_users_info', {'users': user_lines_count, 'file_names': file_names},
        #               callback=log_ack('update_users_info', {'users': user_lines_count, 'file_names': file_names}))

        # Count total number of files
        total_files = len([f for f in os.listdir(DATA_DIR) if os.path.isfile(os.path.join(DATA_DIR, f))])

        # Emit user lines count and the total number of users
        socketio.emit('update_users_info_for_checklist', {'totalFiles': total_files},
                      callback=log_ack('update_users_info_for_checklist', {'totalFiles': total_files}))

        # Emit total number of files
        socketio.emit('number_of_files', {'totalFiles': total_files})


        # Save to output file
        save_to_output_file(file_name, row)

        # Introduce a delay to slow down updates
        time.sleep(0.01)
        # time.sleep(10)

        # Update map separately
        map_data = {'latitude': latitude, 'longitude': longitude, 'floorNumber': floor_number}
        socketio.emit('update_map', {'map': map_data},
                      callback=log_ack('update_map', {'map': map_data}))

        # time.sleep(0.01)





def log_ack(event, data):
    def callback(response):
        print(f"ACK received for event '{event}' with data: {data}, response: {response}")

    return callback


# @socketio.on('select_file')
# def handle_select_file(data):
#     file_name = data.get('file_name')
#
#     try:
#         file_path = os.path.join(DATA_DIR, f"{file_name}.csv")
#         with open(file_path, 'r') as file:
#             file_content = file.read()
#
#         socketio.emit('file_content', {'file_name': file_name, 'latitude': latitude, 'longitude': longitude, 'floorNumber': floor_number})
#     except Exception as e:
#         print(f"Error reading or processing file: {file_name}. Error: {e}")



# # Modify the emit_values function to emit values only for the selected CSV file
# def emit_values():
#     global latitude, longitude, floor_number, user_lines_count, selected_csv_file
#     while True:
#         data = output_queue.get()
#         if data is None:
#             break
#         file_name, row, start_time, current_time = data
#
#         # Replace these values with the actual values from your CSV file or COMM port
#         latitude, longitude, floor_number = row
#
#         # Emit values to the connected clients only if the CSV file matches the selected file
#         if selected_csv_file is not None and file_name != selected_csv_file:
#             continue
#
#         socketio.emit('update_values', {'latitude': latitude, 'longitude': longitude, 'floorNumber': floor_number})
#
#         # Update user lines count for the specific CSV file
#         user_lines_count[file_name] = user_lines_count.get(file_name, 0) + 1
#
#         # Emit user lines count for each CSV file
#         socketio.emit('update_users_info', {'users': user_lines_count})
#
#         # Count total number of files
#         total_files = len([f for f in os.listdir(DATA_DIR) if os.path.isfile(os.path.join(DATA_DIR, f))])
#         socketio.emit('update_users_info_for_checklist', {'totalFiles': total_files})
#
#         # Save to output file
#         save_to_output_file(file_name, row)
#
#         # Introduce a delay to slow down updates
#         time.sleep(0.01)
#
#         # Update map separately
#         map_data = {'latitude': latitude, 'longitude': longitude, 'floorNumber': floor_number}
#         socketio.emit('update_map', {'map': map_data})
#
# # Add a new route to handle selecting a specific CSV file
# @socketio.on('select_csv_file')
# def handle_select_csv_file(data):
#     global selected_csv_file
#     selected_csv_file = data['select_file']
#     print(f"Selected CSV file: {selected_csv_file}")




@socketio.on('connect')
def handle_connect():
    print('Client connected')

    # List all files in the "data" directory
    files_in_data_dir = [f for f in os.listdir(DATA_DIR) if os.path.isfile(os.path.join(DATA_DIR, f))]

    # Create new queue for each connection
    global output_queue
    output_queue = Queue()

    # Create a thread for emitting values
    emit_thread = threading.Thread(target=emit_values)
    emit_thread.start()

    # Process files and put values into the queue
    for file_name in files_in_data_dir:
        read_csv_txt_file(file_name, output_queue)  # Pass the queues to the function

    # Close the queues after processing
    output_queue.put(None)




if __name__ == "__main__":
    # Start the Flask application with SocketIO support
    socketio.run(app, debug=True)










