import os
import threading
import time
import pandas as pd
from queue import Queue

DATA_DIR = '..\\data'  # Update with your directory path


def read_csv_txt_file(file_name, output_queue, lines_count, delimiter=' '):
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

    # Check if there are enough columns before attempting to select them
    if df.shape[1] >= 11:
        # Select columns 7, 8, and 11 (adjust indices as needed)
        selected_columns = df.iloc[:, [6, 7, 10]]

        # Convert the selected columns to a list and put it in the queue
        output_queue.put((file_path, selected_columns.values.tolist(), start_time, time.time()))
        lines_count.put(df.shape[0])  # Increment lines count for each row
    else:
        print(f"File: {file_name} does not have enough columns.")


def process_files(file_names):
    output_queue = Queue()
    lines_count = Queue()

    threads = []
    for file_name in file_names:
        thread = threading.Thread(target=read_csv_txt_file, args=(file_name, output_queue, lines_count))
        threads.append(thread)
        thread.start()

    for thread in threads:
        thread.join()

    total_lines_scanned = sum(lines_count.queue)
    print(f"\nTotal Lines Scanned: {total_lines_scanned}")

    # Collect and print the results
    while not output_queue.empty():
        file_path, selected_columns, start_time, end_time = output_queue.get()
        print(f"File: {file_path}, Columns: {selected_columns}, Start Time: {start_time}, End Time: {end_time}")

if __name__ == "__main__":
    # List all files in the "data" directory
    files_in_data_dir = [f for f in os.listdir(DATA_DIR) if os.path.isfile(os.path.join(DATA_DIR, f))]

    process_files(files_in_data_dir)
