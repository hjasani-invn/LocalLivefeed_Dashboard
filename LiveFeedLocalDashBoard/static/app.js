// URL to the KML file
var kmlUrl = 'static/kml/doc.kml';
var selected_users = []; // Declare selected_users at the beginning of your script

// Create Leaflet map
var map = null;
var kmlData = null;
var south, west, north, east, rotation; // Declare variables for bounds
var currentImageOverlay = null; // To keep track of the current image overlay
var floorSelect = document.getElementById('floor-select');
console.log("Floor Select Element:", floorSelect);
var markers = L.layerGroup(); // Container for user markers
var floors = {}; // Store floor names and associated image URLs
var isPlaying = false;

var data = {
    markers: {}
};





function createCheckboxes(totalFiles) {
    var checkboxContainer = document.getElementById('checkbox-container');
    checkboxContainer.innerHTML = '';

    for (var i = 1; i <= totalFiles; i++) {
        var user = `data_${i}`;
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `checkbox_${user}`;
        checkbox.name = user;
        checkbox.className = 'user-checkbox';
        checkbox.value = user;  // Set the user name as the value

        const textContent = document.createTextNode(user);

        label.appendChild(checkbox);
        label.appendChild(textContent);

        checkboxContainer.appendChild(label);
    }

    // Attach the handleCheckboxChange function to checkbox change events
    var checkboxes = document.getElementsByClassName('user-checkbox');
    for (var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].addEventListener('change', handleCheckboxChange);
    }
}






// function createCheckboxes(totalFiles) {
//     var checkboxContainer = document.getElementById('checkbox-container');
//     checkboxContainer.innerHTML = '';
//
//     var selectedCheckboxes = []; // Store selected checkboxes
//
//     // Store the state of selected checkboxes before recreating them
//     var checkboxes = document.getElementsByClassName('user-checkbox');
//     for (var i = 0; i < checkboxes.length; i++) {
//         if (checkboxes[i].checked) {
//             selectedCheckboxes.push(checkboxes[i].value);
//         }
//     }
//
//     for (var i = 1; i <= totalFiles; i++) {
//         var user = `data_${i}`;
//         const label = document.createElement("label");
//         const checkbox = document.createElement("input");
//         checkbox.type = "checkbox";
//         checkbox.id = `checkbox_${user}`;
//         checkbox.name = user;
//         checkbox.className = 'user-checkbox';
//         checkbox.value = user;  // Set the user name as the value
//
//         const textContent = document.createTextNode(user);
//
//         label.appendChild(checkbox);
//         label.appendChild(textContent);
//
//         checkboxContainer.appendChild(label);
//     }
//
//     // Re-select previously selected checkboxes
//     for (var i = 0; i < selectedCheckboxes.length; i++) {
//         var checkbox = document.getElementById(`checkbox_${selectedCheckboxes[i]}`);
//         if (checkbox) {
//             checkbox.checked = true;
//         }
//     }
//
//     // Attach the handleCheckboxChange function to checkbox change events
//     var checkboxes = document.getElementsByClassName('user-checkbox');
//     for (var i = 0; i < checkboxes.length; i++) {
//         checkboxes[i].addEventListener('change', handleCheckboxChange);
//     }
// }







// Fetch KML file and initialize the map
fetch(kmlUrl)
    .then(res => res.text())
    .then(data => {
        kmlData = new DOMParser().parseFromString(data, 'text/xml');

        // Extract bounds from KML
        var latLonBox = kmlData.querySelector('LatLonBox');
        north = parseFloat(latLonBox.querySelector('north').textContent);
        south = parseFloat(latLonBox.querySelector('south').textContent);
        east = parseFloat(latLonBox.querySelector('east').textContent);
        west = parseFloat(latLonBox.querySelector('west').textContent);
        rotation = latLonBox.querySelector('rotation') ? parseFloat(latLonBox.querySelector('rotation').textContent) : 0;

        map = L.map('map-container').fitBounds([
            [south, west],
            [north, east]
        ]);

        // Add a tile layer (you can choose a different provider if needed)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Initialize marker
        marker = L.marker([51.0652269994906, -114.1446146646332]).addTo(map);

        // Extract floor names and associated image URLs from KML and populate the dropdown
        var groundOverlays = kmlData.querySelectorAll('GroundOverlay');
        groundOverlays.forEach(overlay => {
            var floorName = overlay.querySelector('name').textContent;
            var imageUrl = 'static/kml/' + overlay.querySelector('Icon href').textContent;
            floors[floorName] = imageUrl;
        });

        populateFloorOptions(Object.keys(floors));

        // Add initial overlay image for the default floor
        var defaultFloor = floorSelect.value;
        var defaultImageUrl = floors[defaultFloor];
        var defaultImageBounds = [
            [south, west],
            [north, east]
        ];

        floorSelect.addEventListener('change', changeFloor);
        updateMarkers();

        // Set default rotation (you can adjust this value)
        var rotation = parseFloat(kmlData.querySelector('rotation').textContent);

        addRotatedImageOverlay(defaultImageUrl, defaultImageBounds, rotation);
    })
    .catch(error => console.error('Error fetching KML:', error));

// // Function to populate floor options in the dropdown
// function populateFloorOptions(floorOptions) {
//     floorOptions.forEach(floor => {
//         var option = document.createElement('option');
//         option.value = floor;
//         option.textContent = floor;
//         floorSelect.appendChild(option);
//     });
// }



// Function to populate floor options in the dropdown
function populateFloorOptions(floorOptions) {
    // Clear existing options
    floorSelect.innerHTML = '';

    floorOptions.forEach(floor => {
        var option = document.createElement('option');
        option.value = floor;
        option.textContent = floor;
        floorSelect.appendChild(option);
    });

    // Trigger a change event to select the default floor
    var event = new Event('change');
    floorSelect.dispatchEvent(event);
}





var selected_floor = null;

function changeFloor() {
    console.log("changeFloor function called");
    stopPlayback();
    selected_floor = floorSelect.value;
    console.log("Selected Floor:", selected_floor);

    // updateMarkers();

    var imageUrl = floors[selected_floor]; // Update the variable name here

    map.eachLayer(function (layer) {
        if (layer instanceof L.ImageOverlay || layer === markers) {
            map.removeLayer(layer);
        }
    });

    var rotation = parseFloat(kmlData.querySelector('rotation').textContent);
    var imageBounds = [
        [south, west],
        [north, east]
    ];
}









// // Variable to count the number of markers displayed
// var markerCounter = 0;
// async function updateMarkers() {
//     console.log("inside updateMarkers");
//     var selectedFloor = selected_floor.toUpperCase().replace('F', ''); // Remove 'F' prefix
//     console.log("Selected Floor:", selected_floor);
//     console.log("Selected Users:", selected_users);
//
//     // Clear previous markers
//     markers.clearLayers();
//
//     // Counter to track the number of values changed
//     var valueCounter = 0;
//
//     // Check if real-time updates are still enabled
//     if (!isPlaying) {
//         console.log("Real-time updates are not enabled. Stopping marker updates.");
//         return;
//     }
//
//
//
//         // Reset the marker counter
//     markerCounter = 0;
//
//
//
//
//     if (selectedFloor && selected_users.length > 0) {
//         for (const user of selected_users) {
//             try {
//                 const response = await fetch(`http://localhost:5000/static/data/${user}.csv`);
//                 const csvData = await response.text();
//                 console.log("CSV data:", csvData);
//
//                 // Parse CSV data
//                 var lines = csvData.split('\n');
//                 var latitudeIndex = 7; // Assuming latitude is at column 7
//                 var longitudeIndex = 8; // Assuming longitude is at column 8
//                 var floorNumberIndex = 11; // Assuming floor number is at column 11
//
//                 // Process each row of the CSV data
//                 var delay = 10; // Delay in milliseconds between each marker update
//                 for (let index = 0; index < lines.length; index++) {
//                     await new Promise(resolve => setTimeout(resolve, index * delay));
//                     var line = lines[index];
//                     var rowData = line.split(',');
//                     var floorNumber = parseInt(rowData[floorNumberIndex]); // Parsing the floor number
//                     if (!isNaN(floorNumber)) {
//                         var floorNumberTrimmed = rowData[floorNumberIndex].trim(); // Trim whitespace
//                         if (floorNumberTrimmed === selectedFloor) {
//                             var latitude = parseFloat(rowData[latitudeIndex]);
//                             var longitude = parseFloat(rowData[longitudeIndex]);
//                             console.log(`CSV: ${user}, Latitude: ${latitude}, Longitude: ${longitude}, Floor Number: ${floorNumber}`);
//                             if (!isNaN(latitude) && !isNaN(longitude)) {
//                                 // Create a unique marker icon for each user
//                                 var userMarkerIcon = createMarkerIcon(user); // Assuming user as the identifier for marker color
//                                 // Create a new marker for each user
//                                 var userMarker = L.marker([latitude, longitude], {
//                                     icon: userMarkerIcon
//                                 }).addTo(map);
//                                 markers.addLayer(userMarker); // Add the marker to the layer group
//                                 valueCounter++; // Increment the counter for each value changed
//                                 // Increment the marker counter
//                                 markerCounter++;
//                             }
//                         }
//                     }
//                 }
//             } catch (error) {
//                 console.error('Error fetching or processing CSV:', error);
//             }
//         }
//     } else {
//         console.log("No floor or user selected.");
//     }
//
//     // Log the total number of values changed
//     console.log(`Total values changed: ${valueCounter}`);
//
//     // Log the total number of markers displayed
//     console.log("Total markers displayed:", markerCounter);
// }






// Variable to count the number of markers displayed
var markerCounter = 0;

// async function updateMarkers() {
//     console.log("Inside updateMarkers");
//     console.log("Selected Floor:", selected_floor);
//     console.log("Selected Users:", selected_users);
//
//     // Clear previous markers
//     markers.clearLayers();
//
//     // Counter to track the number of values changed
//     var valueCounter = 0;
//
//     // Check if real-time updates are still enabled
//     if (!isPlaying) {
//         console.log("Real-time updates are not enabled. Stopping marker updates.");
//         return;
//     }
//
//     // Reset the marker counter
//     markerCounter = 0;
//
//     var selectedFloor = selected_floor.trim().toUpperCase(); // Convert to uppercase and remove leading/trailing whitespace
//     if (selectedFloor.startsWith('F')) {
//         selectedFloor = selectedFloor.substring(1); // Remove 'F' prefix
//         if (selectedFloor === '1') {
//             selectedFloor = '0'; // Treat 'F1' as 0
//         }
//     } else if (selectedFloor.startsWith('P')) {
//         selectedFloor = '-' + (parseInt(selectedFloor.substring(1)) || ''); // Convert 'P1' to '-1', 'P2' to '-2', etc.
//     }
//
//     if (selectedFloor !== null && selected_users.length > 0) {
//         for (const user of selected_users) {
//             try {
//                 const response = await fetch(`http://localhost:5000/static/data/${user}.csv`);
//                 const csvData = await response.text();
//                 console.log("CSV data:", csvData);
//
//                 // Parse CSV data
//                 var lines = csvData.split('\n');
//                 var latitudeIndex = 7; // Assuming latitude is at column 7
//                 var longitudeIndex = 8; // Assuming longitude is at column 8
//                 var floorNumberIndex = 11; // Assuming floor number is at column 11
//
//                 // Process each row of the CSV data
//                 var delay = 10; // Delay in milliseconds between each marker update
//                 for (let index = 0; index < lines.length; index++) {
//                     await new Promise(resolve => setTimeout(resolve, index * delay));
//                     var line = lines[index];
//                     var rowData = line.split(',');
//                     var floorNumber = parseInt(rowData[floorNumberIndex]); // Parsing the floor number
//                     if (!isNaN(floorNumber)) {
//                         var floorNumberTrimmed = rowData[floorNumberIndex].trim(); // Trim whitespace
//                         if (floorNumberTrimmed === selectedFloor) {
//                             var latitude = parseFloat(rowData[latitudeIndex]);
//                             var longitude = parseFloat(rowData[longitudeIndex]);
//                             console.log(`CSV: ${user}, Latitude: ${latitude}, Longitude: ${longitude}, Floor Number: ${floorNumber}`);
//                             if (!isNaN(latitude) && !isNaN(longitude)) {
//                                 // Create a unique marker icon for each user
//                                 var userMarkerIcon = createMarkerIcon(user); // Assuming user as the identifier for marker color
//
//                                 // Create a new marker for each user with a custom icon containing the label
//
//
//                                 // Create a new marker for each user
//                                 var userMarker = L.marker([latitude, longitude], {
//                                     icon: userMarkerIcon
//                                 }).bindTooltip(`User: ${user}`, { noHide: true }).addTo(map);
//                                 markers.addLayer(userMarker); // Add the marker to the layer group
//                                 valueCounter++; // Increment the counter for each value changed
//                                 // Increment the marker counter
//                                 markerCounter++;
//                             }
//                         }
//                     }
//                 }
//             } catch (error) {
//                 console.error('Error fetching or processing CSV:', error);
//             }
//         }
//     } else {
//         console.log("No floor or user selected.");
//     }
//
//     // Log the total number of values changed
//     console.log(`Total values changed: ${valueCounter}`);
//
//     // Log the total number of markers displayed
//     console.log("Total markers displayed:", markerCounter);
// }






async function updateMarkers() {
    try {
        console.log("Inside updateMarkers");
        console.log("Selected Floor:", selected_floor);
        console.log("Selected Users:", selected_users);

        // Clear previous markers
        markers.clearLayers();

        // Counter to track the number of values changed
        var valueCounter = 0;

        // Check if real-time updates are still enabled
        if (!isPlaying) {
            console.log("Real-time updates are not enabled. Stopping marker updates.");
            return;
        }

        // Reset the marker counter
        markerCounter = 0;

        var selectedFloor = selected_floor.trim().toUpperCase(); // Convert to uppercase and remove leading/trailing whitespace
        if (selectedFloor.startsWith('F')) {
            selectedFloor = selectedFloor.substring(1); // Remove 'F' prefix
            if (selectedFloor === '1') {
                selectedFloor = '0'; // Treat 'F1' as 0
            }
        } else if (selectedFloor.startsWith('P')) {
            selectedFloor = '-' + (parseInt(selectedFloor.substring(1)) || ''); // Convert 'P1' to '-1', 'P2' to '-2', etc.
        }

        if (selectedFloor !== null && selected_users.length > 0) {
            // Array to store promises for fetching CSV data
            const fetchPromises = selected_users.map(async (user) => {
                const response = await fetch(`http://localhost:5000/static/data/${user}.csv`);
                const csvData = await response.text();
                console.log("CSV data:", csvData);

                // Parse CSV data
                var lines = csvData.split('\n');
                var latitudeIndex = 7; // Assuming latitude is at column 7
                var longitudeIndex = 8; // Assuming longitude is at column 8
                var floorNumberIndex = 11; // Assuming floor number is at column 11

                // Process each row of the CSV data
                var delay = 10; // Delay in milliseconds between each marker update
                for (let index = 0; index < lines.length; index++) {
                    await new Promise(resolve => setTimeout(resolve, index * delay));
                    var line = lines[index];
                    var rowData = line.split(',');
                    var floorNumber = parseInt(rowData[floorNumberIndex]); // Parsing the floor number
                    if (!isNaN(floorNumber)) {
                        var floorNumberTrimmed = rowData[floorNumberIndex].trim(); // Trim whitespace
                        if (floorNumberTrimmed === selectedFloor) {
                            var latitude = parseFloat(rowData[latitudeIndex]);
                            var longitude = parseFloat(rowData[longitudeIndex]);
                            console.log(`CSV: ${user}, Latitude: ${latitude}, Longitude: ${longitude}, Floor Number: ${floorNumber}`);
                            if (!isNaN(latitude) && !isNaN(longitude)) {
                                // Create a unique marker icon for each user
                                var userMarkerIcon = createMarkerIcon(user); // Assuming user as the identifier for marker color

                                // Create a new marker for each user
                                var userMarker = L.marker([latitude, longitude], {
                                    icon: userMarkerIcon
                                }).bindTooltip(`User: ${user}`, { noHide: true }).addTo(map);
                                markers.addLayer(userMarker); // Add the marker to the layer group
                                valueCounter++; // Increment the counter for each value changed
                                // Increment the marker counter
                                markerCounter++;
                            }
                        }
                    }
                }
            });

            // Wait for all CSV data to be fetched and processed
            await Promise.all(fetchPromises);
        } else {
            console.log("No floor or user selected.");
        }

        // Log the total number of values changed
        console.log(`Total values changed: ${valueCounter}`);

        // Log the total number of markers displayed
        console.log("Total markers displayed:", markerCounter);
    } catch (error) {
        console.error('Error fetching or processing CSV:', error);
    }
}












// Add an event listener for file checkbox change events
var fileCheckboxes = document.getElementsByClassName('file-checkbox');
for (var i = 0; i < fileCheckboxes.length; i++) {
    fileCheckboxes[i].addEventListener('change', handleFileCheckboxChange);
}

// function handleCheckboxChange() {
//     // Example: Selecting a file named 'data_1.csv'
//     var selectedFileName = event.target.value;
//     socket.emit('select_file', { file_name: selectedFileName });
//
//     console.log('Checkbox state changed')
//     selected_users = Array.from(document.getElementsByClassName('user-checkbox'))
//         .filter(checkbox => checkbox.checked)
//         .map(checkbox => checkbox.value);
//     console.log("Selected Users:", selected_users);
//
//     // updateMarkers();
// }


var selected_users = []; // Initialize selected_users array

// Function to handle checkbox change events
function handleCheckboxChange() {
    selected_users = Array.from(document.getElementsByClassName('user-checkbox'))
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);
    console.log("Selected Users:", selected_users);
}


// Function to start real-time updates
function startRealTimeUpdates() {
    console.log('Starting real-time updates');
    isPlaying = true; // Ensure isPlaying is set to true when starting updates
    playButton.textContent = 'Pause'; // Update button text to "Pause"


    // Set up socket event listener for real-time updates
    socket.on('update_values', handleRealTimeUpdates);



    // socket.on('update_values', function(data) {
    //     document.getElementById('latitude').innerText = data.latitude;
    //     document.getElementById('longitude').innerText = data.longitude;
    //     document.getElementById('floor-number').innerText = data.floorNumber;
    //
    //     // Log coordinates to the console
    //     console.log("Coordinates (Real-time):", data);
    //
    //     // Move marker to real-time coordinates
    //     marker.setLatLng([data.latitude, data.longitude]);
    // });

    // After all CSV lines have been read, reset the UI and switch the button back to "Play"
    socket.on('csv_finished', function() {
        console.log('All CSV lines have been read');
        stopRealTimeUpdates(); // Stop real-time updates
        isPlaying = false; // Set isPlaying to false
        playButton.textContent = 'Play'; // Update button text to "Play"
    });
}


// Function to handle real-time updates
function handleRealTimeUpdates(data) {
    // Add necessary logic to handle real-time updates
    document.getElementById('latitude').innerText = data.latitude;
    document.getElementById('longitude').innerText = data.longitude;
    document.getElementById('floor-number').innerText = data.floorNumber;
    // Log coordinates to the console
    console.log("Coordinates (Real-time):", data);
    // Move marker to real-time coordinates
    marker.setLatLng([data.latitude, data.longitude]);
}



// // Function to stop real-time updates
// function stopRealTimeUpdates() {
//     console.log("Stopping real-time updates");
//     // Unsubscribe from socket updates
//     socket.off('update_values', handleRealTimeUpdates);
//     socket.off('csv_finished');
//     isPlaying = false;
// }
//
//
//
//
// Function to toggle LiveFeed
// function toggleLivefeed() {
//     if (!isPlaying) {
//         startLivefeed();
//     } else {
//         stopLivefeed();
//     }
// }
//
// // Function to start LiveFeed
// async function startLivefeed() {
//     console.log('Starting LiveFeed');
//     isPlaying = true;
//     liveFeedButton.textContent = 'Stop LiveFeed'; // Update button text to "Stop LiveFeed"
//
//     try {
//         // Fetch CSV data for selected users
//         for (const user of selected_users) {
//             const response = await fetch(`http://localhost:5000/static/data/${user}.csv`);
//             const csvData = await response.text();
//             console.log("CSV data:", csvData);
//
//             // Parse CSV data
//             var lines = csvData.split('\n');
//             var latitudeIndex = 7; // Assuming latitude is at column 7
//             var longitudeIndex = 8; // Assuming longitude is at column 8
//             var floorNumberIndex = 11; // Assuming floor number is at column 11
//
//             // Process each row of the CSV data
//             var delay = 1; // Delay in milliseconds between each marker update
//             for (let index = 0; index < lines.length; index++) {
//                 await new Promise(resolve => setTimeout(resolve, index * delay));
//                 var line = lines[index];
//                 var rowData = line.split(',');
//                 var floorNumber = parseInt(rowData[floorNumberIndex]); // Parsing the floor number
//                 if (!isNaN(floorNumber)) {
//                     var floorNumberTrimmed = rowData[floorNumberIndex].trim(); // Trim whitespace
//                     if (floorNumberTrimmed === selected_floor) {
//                         var latitude = parseFloat(rowData[latitudeIndex]);
//                         var longitude = parseFloat(rowData[longitudeIndex]);
//                         console.log(`CSV: ${user}, Latitude: ${latitude}, Longitude: ${longitude}, Floor Number: ${floorNumber}`);
//                         if (!isNaN(latitude) && !isNaN(longitude)) {
//                             // Update marker position
//                             marker.setLatLng([latitude, longitude]);
//                         }
//                     }
//                 }
//             }
//         }
//     } catch (error) {
//         console.error('Error fetching or processing CSV:', error);
//     }
// }
//
//
// // Function to stop LiveFeed
// function stopLivefeed() {
//     console.log('Stopping LiveFeed');
//     isPlaying = false;
//     liveFeedButton.textContent = 'LiveFeed'; // Update button text to "LiveFeed"
// }


// Function to start livefeed
// function startLiveFeed() {
//     console.log('Starting LiveFeed');
//     isPlaying = true; // Set isPlaying to true when starting liveFeed
//
//     // Update the text content of the button to indicate the liveFeed is playing
//     liveFeedButton.textContent = 'StopLiveFeed';
//
//     // Establish Socket.IO connection
//     socket = io.connect('http://' + document.domain + ':' + location.port);
//
//     // Update Latitude, Longitude, and Floor Number values for real-time updates
//     socket.on('update_values', function(data) {
//         console.log('Values data updated:', data);
//         document.getElementById('latitude').innerText = data.latitude;
//         document.getElementById('longitude').innerText = data.longitude;
//         document.getElementById('floor-number').innerText = data.floorNumber;
//         marker.setLatLng([data.latitude, data.longitude, data.floorNumber]);
//
//     });


    // // Listen for real-time updates from the server
    // socket.on('update_map', function (data) {
    //     console.log('Map data updated:', data);
    //     // Update marker position based on received data
    //     marker.setLatLng([data.map.latitude, data.map.longitude]);
    // });


// }



function startLiveFeed() {
    console.log('Starting LiveFeed');
    isPlaying = true; // Set isPlaying to true when starting liveFeed

    // Update the text content of the button to indicate the liveFeed is playing
    liveFeedButton.textContent = 'StopLiveFeed';

    // Establish Socket.IO connection
    socket = io.connect('http://' + document.domain + ':' + location.port);

    console.log('Button text content:', liveFeedButton.textContent); // Log the button text content

    // Check if the button text content is "StopLiveFeed"
    if (liveFeedButton.textContent === 'StopLiveFeed') {
        console.log('Subscribing to real-time updates...'); // Log that we are subscribing to real-time updates
        // Update Latitude, Longitude, and Floor Number values for real-time updates
        socket.on('update_values', function(data) {
            console.log('Values data updated:', data);
            document.getElementById('latitude').innerText = data.latitude;
            document.getElementById('longitude').innerText = data.longitude;
            document.getElementById('floor-number').innerText = data.floorNumber;
            marker.setLatLng([data.latitude, data.longitude, data.floorNumber]);
        });
    } else {
        // Stop real-time updates if the button text content is not "StopLiveFeed"
        console.log('Stopping LiveFeed from startLiveFeed function...'); // Log that we are stopping LiveFeed
        stopLiveFeed();
        console.log('LiveFeed stopped'); // Add a log statement to indicate that LiveFeed is stopped
    }
}






function stopLiveFeed() {
    console.log('Stopping LiveFeed');
    isPlaying = false; // Set isPlaying to false when stopping liveFeed

    // Update the text content of the button to indicate the liveFeed is paused
    liveFeedButton.textContent = 'LiveFeed';

    // Close the Socket.IO connection to stop receiving real-time updates
    if (socket) {
        socket.close();
        socket.removeAllListeners(); // This will remove all event listeners from the socket
        console.log('Socket listeners removed'); // Add a log statement to indicate that socket listeners are removed
    }
    console.log('LiveFeed stopped'); // Add a log statement to indicate that the live feed has stopped
}


// Function to toggle LiveFeed
function toggleLiveFeed() {
    if (!isPlaying) {
        startLiveFeed();
    } else {
        stopLiveFeed();
    }
}





// Function to stop real-time updates
function stopRealTimeUpdates() {
    console.log("Stopping real-time updates");
    // Unsubscribe from socket updates
    socket.off('update_values');
    socket.off('csv_finished');
    isPlaying = false;

    markers.clearLayers()
    liveFeedButton.textContent = 'LiveFeed'; // Changed text to "LiveFeed"


}



function clearPositions() {
    // Remove all asset markers from the map
    assetMarkers.clearLayers();


    // Uncheck all checked checkboxes
    const checkboxes = document.querySelectorAll('.assets-checkbox:checked');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });

}




// Attach the handleCheckboxChange function to checkbox change events
var checkboxes = document.getElementsByClassName('user-checkbox');
for (var i = 0; i < checkboxes.length; i++) {
    checkboxes[i].addEventListener('change', handleCheckboxChange);
}

var playButton = document.getElementById('playButton');




// // Function to toggle playback
// function togglePlayback() {
//     isPlaying = !isPlaying;
//     playButton.textContent = isPlaying ? 'Pause' : 'Play';
//
//     if (isPlaying) {
//         // Start real-time updates only when play button is pressed and valid floor and users are selected
//         if (selected_floor !== null && selected_users.length > 0) {
//             console.log("Starting real-time updates for floor:", selected_floor, "and users:", selected_users);
//             startRealTimeUpdates();
//             updateMarkers(); // Call updateMarkers when starting playback
//         } else {
//             console.log("Select a floor and user before playing.");
//             isPlaying = false;
//             playButton.textContent = 'Play';
//         }
//     } else {
//         console.log("Pausing real-time updates.");
//         stopRealTimeUpdates(); // Pause real-time updates when playback is paused
//     }
// }


// Function to toggle playback
function togglePlayback() {
    isPlaying = !isPlaying;
    playButton.textContent = isPlaying ? 'Pause' : 'Play';

    if (isPlaying) {
        // Start real-time updates only when play button is pressed and valid floor and users are selected
        if (selected_floor !== null && selected_users.length > 0) {
            console.log("Starting real-time updates for floor:", selected_floor, "and users:", selected_users);
            startRealTimeUpdates();
            updateMarkers(); // Call updateMarkers when starting playback
        } else {
            console.log("Select a floor and user before playing.");
            isPlaying = false;
            playButton.textContent = 'Play';
        }
    } else {
        console.log("Pausing real-time updates.");
        stopRealTimeUpdates(); // Pause real-time updates when playback is paused
    }

    // If LiveFeed is active, stop it when playback is clicked
    if (isPlaying && isLiveFeedActive()) {
        stopLiveFeed();
    }
}

// Function to check if LiveFeed is active
function isLiveFeedActive() {
    return isPlaying && liveFeedButton.textContent === 'Pause';
}





// Function to stop playback
function stopPlayback() {
    isPlaying = false;
    playButton.textContent = 'Play';
    stopRealTimeUpdates();
    markers.clearLayers();
}







// var asset_users = []; // Initialize asset_users array
//
// // Function to handle checkbox change events for assets
// function handleCheckboxChangeAssets() {
//     asset_users = Array.from(document.getElementsByClassName('assets-checkbox'))
//         .filter(checkbox => checkbox.checked)
//         .map(checkbox => checkbox.value);
//     console.log("Assets Users:", asset_users);
// }



function createCheckboxesForAssets(totalFiles) {
    var checkboxContainer = document.getElementById('checkbox-container-for-assets');
    checkboxContainer.innerHTML = '';

    for (var i = 1; i <= totalFiles; i++) {
        var user = `data_${i}`;
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `checkbox_${user}`;
        checkbox.name = user;
        checkbox.className = 'assets-checkbox'; // Corrected class name here
        checkbox.value = user;  // Set the user name as the value

        const textContent = document.createTextNode(user);

        label.appendChild(checkbox);
        label.appendChild(textContent);

        checkboxContainer.appendChild(label);
    }

    // Attach the handleCheckboxChange function to checkbox change events
    var checkboxes = document.getElementsByClassName('assets-checkbox'); // Corrected class name here
    for (var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].addEventListener('change', handleCheckboxChange);
    }
}









// Define a layer group to store asset markers
var assetMarkers = L.layerGroup();

//Function to load assets
// function loadAssets() {
//
//     // Fetch the CSV file containing asset data
//     fetch('http://localhost:5000/static/data/data_1.csv')
//     // fetch('http://localhost:5000/static/data/${user}.csv')
//         .then(response => response.text())
//         .then(csvData => {
//             // Parse the CSV data
//             const rows = csvData.split('\n');
//             for (let i = 1; i < rows.length; i++) { // Start from index 1 to skip header row
//                 const columns = rows[i].split(',');
//                 const latitude = parseFloat(columns[7]); // Assuming latitude is in first column
//                 const longitude = parseFloat(columns[8]); // Assuming longitude is in second column
//                 if (!isNaN(latitude) && !isNaN(longitude)) { // Check if latitude and longitude are valid numbers
//                     // Create a marker for the asset location
//                     const assetMarker = L.marker([latitude, longitude]).addTo(map);
//                     // Optionally, you can customize the marker icon or add a tooltip
//                     // assetMarker.setIcon(...);
//                     assetMarker.bindTooltip('Asset Name');
//                     // Add the marker to the assetMarkers layer group
//                     assetMarkers.addLayer(assetMarker);
//                 }
//             }
//             // Add the layer group containing asset markers to the map
//             map.addLayer(assetMarkers);
//         })
//         .catch(error => {
//             console.error('Error loading asset data:', error);
//         });
// }






// function loadAssets() {
//     const fileNames = ['data_1.csv', 'data_2.csv', 'data_3.csv', 'data_4.csv', 'data_5.csv']; // List of file names
//
//     // Iterate over each file name and fetch the corresponding CSV data
//     fileNames.forEach(fileName => {
//         fetch(`http://localhost:5000/static/data/${fileName}`)
//             .then(response => {
//                 if (!response.ok) {
//                     throw new Error(`Failed to fetch ${fileName}`);
//                 }
//                 return response.text();
//             })
//             .then(csvData => {
//                 // Parse the CSV data
//                 const rows = csvData.split('\n');
//                 for (let i = 1; i < rows.length; i++) { // Start from index 1 to skip header row
//                     const columns = rows[i].split(',');
//                     const latitude = parseFloat(columns[7]); // Assuming latitude is in first column
//                     const longitude = parseFloat(columns[8]); // Assuming longitude is in second column
//                     if (!isNaN(latitude) && !isNaN(longitude)) { // Check if latitude and longitude are valid numbers
//                         // Create a marker for the asset location
//                         const assetMarker = L.marker([latitude, longitude]).addTo(map);
//                         // Optionally, you can customize the marker icon or add a tooltip
//                         // assetMarker.setIcon(...);
//                         assetMarker.bindTooltip('Asset Name');
//                         // Add the marker to the assetMarkers layer group
//                         assetMarkers.addLayer(assetMarker);
//                     }
//                 }
//                 // Add the layer group containing asset markers to the map
//                 map.addLayer(assetMarkers);
//             })
//             .catch(error => {
//                 console.error(`Error loading asset data for ${fileName}:`, error);
//             });
//     });
// }






// function loadAssets() {
//     if (asset_users.length > 0) {
//         for (const user of asset_users) {
//             // Fetch the CSV file containing asset data for each user
//             // fetch(`http://localhost:5000/static/data/${user}.csv`)
//                 fetch('http://localhost:5000/static/data/data_1.csv')
//
//                 .then(response => response.text())
//                 .then(csvData => {
//                     // Parse the CSV data
//                     const rows = csvData.split('\n');
//                     for (let i = 1; i < rows.length; i++) { // Start from index 1 to skip header row
//                         const columns = rows[i].split(',');
//                         const latitude = parseFloat(columns[7]); // Assuming latitude is in first column
//                         const longitude = parseFloat(columns[8]); // Assuming longitude is in second column
//                         if (!isNaN(latitude) && !isNaN(longitude)) { // Check if latitude and longitude are valid numbers
//                             // Create a marker for the asset location
//                             const assetMarker = L.marker([latitude, longitude]).addTo(map);
//                             // Optionally, you can customize the marker icon or add a tooltip
//                             // assetMarker.setIcon(...);
//                             assetMarker.bindTooltip('Asset Name');
//                             // Add the marker to the assetMarkers layer group
//                             assetMarkers.addLayer(assetMarker);
//                         }
//                     }
//                     // Add the layer group containing asset markers to the map
//                     map.addLayer(assetMarkers);
//                 })
//                 .catch(error => {
//                     console.error(`Error loading asset data for ${user}.csv:`, error);
//                 });
//         }
//     }
// }




//
//     const fileNames = ['data_1.csv', 'data_2.csv', 'data_3.csv']; // List of file names
//
// function loadAssets() {
//
//
//
//     const checkboxes = document.querySelectorAll('.assets-checkbox:checked'); // Get all checked checkboxes
//
//     // Iterate over each checked checkbox
//     checkboxes.forEach((checkbox, index) => {
//         const fileName = checkbox.value; // Get the value of the checkbox (which corresponds to the file name)
//         const color = getRandomColor(); // Generate a random color for each checkbox
//
//         fetch(`http://localhost:5000/static/data/${fileName}.csv`)
//             .then(response => {
//                 if (!response.ok) {
//                     throw new Error(`Failed to fetch ${fileName}`);
//                 }
//                 return response.text();
//             })
//             .then(csvData => {
//                 // Parse the CSV data
//                 const rows = csvData.split('\n');
//                 for (let i = 1; i < rows.length; i++) { // Start from index 1 to skip header row
//                     const columns = rows[i].split(',');
//                     const latitude = parseFloat(columns[7]); // Assuming latitude is in first column
//                     const longitude = parseFloat(columns[8]); // Assuming longitude is in second column
//                     if (!isNaN(latitude) && !isNaN(longitude)) { // Check if latitude and longitude are valid numbers
//                         // Create a marker for the asset location with the specified color
//                         const assetMarker = L.marker([latitude, longitude], {
//                             icon: createMarkerIcon(color) // Pass the color to the createMarkerIcon function
//                         }).addTo(map);
//                         // Optionally, you can customize the marker icon or add a tooltip
//                         // assetMarker.setIcon(...);
//                         assetMarker.bindTooltip(checkbox.name);
//                         // assetMarker.bindTooltip(`User: ${user}`, { noHide: true });
//
//                         // var userMarker = L.marker([latitude, longitude], {
//                         //             icon: userMarkerIcon
//                         //         }).bindTooltip(`User: ${user}`, { noHide: true }).addTo(map);
//
//                         // Add the marker to the assetMarkers layer group
//                         assetMarkers.addLayer(assetMarker);
//                     }
//                 }
//                 // Add the layer group containing asset markers to the map
//                 map.addLayer(assetMarkers);
//             })
//             .catch(error => {
//                 console.error(`Error loading asset data for ${fileName}.csv:`, error);
//             });
//     });
// }




//// BELOW METHOD IS WORKING
// function loadAssets() {
//     const checkboxes = document.querySelectorAll('.assets-checkbox:checked'); // Get all checked checkboxes
//
//     // Iterate over each checked checkbox
//     checkboxes.forEach((checkbox, index) => {
//         const user = checkbox.value; // Get the value of the checkbox (which corresponds to the user name)
//         const color = getRandomColor(); // Generate a random color for each checkbox
//
//         fetch(`http://localhost:5000/static/data/${user}.csv`)
//             .then(response => {
//                 if (!response.ok) {
//                     throw new Error(`Failed to fetch ${user}.csv`);
//                 }
//                 return response.text();
//             })
//             .then(csvData => {
//                 // Parse the CSV data
//                 const rows = csvData.split('\n');
//                 for (let i = 1; i < rows.length; i++) { // Start from index 1 to skip header row
//                     const columns = rows[i].split(',');
//                     const latitude = parseFloat(columns[7]); // Assuming latitude is in first column
//                     const longitude = parseFloat(columns[8]); // Assuming longitude is in second column
//                     if (!isNaN(latitude) && !isNaN(longitude)) { // Check if latitude and longitude are valid numbers
//                         // Create a marker for the asset location with the specified color
//                         const assetMarker = L.marker([latitude, longitude], {
//                             icon: createMarkerIcon(color) // Pass the color to the createMarkerIcon function
//                         }).addTo(map);
//                         // Optionally, you can customize the marker icon or add a tooltip
//                         // assetMarker.setIcon(...);
//                         assetMarker.bindTooltip(checkbox.name);
//
//                         // Add the marker to the assetMarkers layer group
//                         assetMarkers.addLayer(assetMarker);
//                     }
//                 }
//                 // Add the layer group containing asset markers to the map
//                 map.addLayer(assetMarkers);
//             })
//             .catch(error => {
//                 console.error(`Error loading asset data for ${user}.csv:`, error);
//             });
//     });
// }





// async function loadAssets() {
//     const checkboxes = document.querySelectorAll('.assets-checkbox:checked'); // Get all checked checkboxes
//
//     // Clear previous markers before fetching and adding new ones
//     assetMarkers.clearLayers();
//     console.log("Previous markers cleared.");
//
//     // Iterate over each checked checkbox
//     for (const checkbox of checkboxes) {
//         const user = checkbox.value; // Get the value of the checkbox (which corresponds to the user name)
//         const color = getRandomColor(); // Generate a random color for each checkbox
//         const userMarkers = L.layerGroup();
//
//
//         let markerCount = 0; // Counter to track how many markers are added for this user
//
//
//         try {
//             const response = await fetch(`http://localhost:5000/static/data/${user}.csv`);
//             if (!response.ok) {
//                 throw new Error(`Failed to fetch ${user}.csv`);
//             }
//             const csvData = await response.text();
//
//             // Parse the CSV data
//             const rows = csvData.split('\n');
//             for (let i = 0; i < rows.length; i++) { // Start from index 1 to skip header row
//                 const row = rows[i];
//                 const columns = row.split(',');
//                 const latitude = parseFloat(columns[7]); // Assuming latitude is in first column
//                 const longitude = parseFloat(columns[8]); // Assuming longitude is in second column
//
//                 if (!isNaN(latitude) && !isNaN(longitude)) { // Check if latitude and longitude are valid numbers
//                     // Remove previous markers before adding a new one
//                     assetMarkers.clearLayers();
//                     console.log("Previous markers cleared.");
//
//                     // userMarkers.clearLayers();
//                     // console.log("Previous markers cleared for", user);
//
//                     // Create a marker for the asset location with the specified color
//                     const assetMarker = L.marker([latitude, longitude], {
//                         icon: createMarkerIcon(color) // Pass the color to the createMarkerIcon function
//                     }).addTo(map);
//                     // Optionally, you can customize the marker icon or add a tooltip
//                     // assetMarker.setIcon(...);
//                     assetMarker.bindTooltip(checkbox.name);
//
//                     // Add the marker to the assetMarkers layer group
//                     assetMarkers.addLayer(assetMarker);
//                     // userMarkers.addLayer(assetMarker)
//                     markerCount++;
//                     console.log(`Marker added for ${user}. - ${markerCount}`);
//
//                     // Wait for 1 second before removing the marker
//                     await new Promise(resolve => setTimeout(resolve, 20));
//
//                     // Remove the marker after 1 second
//                     // assetMarkers.removeLayer(assetMarker);
//                     assetMarker.remove();
//                     console.log(`Marker removed for ${user}. - ${markerCount}`);
//
//                 }
//
//             }
//         } catch (error) {
//             console.error(`Error loading asset data for ${user}.csv:`, error);
//         }
//     }
//
//     // Add the layer group containing asset markers to the map
//     map.addLayer(assetMarkers);
//     console.log("All markers added to the map.");
// }




//// this code displays N number of files very last positions all together

// async function loadAssets() {
//     const checkboxes = document.querySelectorAll('.assets-checkbox:checked'); // Get all checked checkboxes
//
//     // Clear previous markers before fetching and adding new ones
//     assetMarkers.clearLayers();
//     console.log("Previous markers cleared.");
//
//     // Iterate over each checked checkbox
//     for (const checkbox of checkboxes) {
//         const user = checkbox.value; // Get the value of the checkbox (which corresponds to the user name)
//         const color = getRandomColor(); // Generate a random color for each checkbox
//
//         try {
//             const response = await fetch(`http://localhost:5000/static/data/${user}.csv`);
//             if (!response.ok) {
//                 throw new Error(`Failed to fetch ${user}.csv`);
//             }
//             const csvData = await response.text();
//
//             // Parse the CSV data
//             const rows = csvData.split('\n');
//             let lastLatitude, lastLongitude; // Variables to store the last marker's coordinates
//             for (let i = 0; i < rows.length; i++) { // Start from index 1 to skip header row
//                 const row = rows[i];
//                 const columns = row.split(',');
//                 const latitude = parseFloat(columns[7]); // Assuming latitude is in first column
//                 const longitude = parseFloat(columns[8]); // Assuming longitude is in second column
//
//                 if (!isNaN(latitude) && !isNaN(longitude)) { // Check if latitude and longitude are valid numbers
//                     // Update the last marker's coordinates
//                     lastLatitude = latitude;
//                     lastLongitude = longitude;
//                 }
//             }
//
//             // Create a marker for the last known position of the current file
//             if (!isNaN(lastLatitude) && !isNaN(lastLongitude)) {
//                 const lastMarker = L.marker([lastLatitude, lastLongitude], {
//                     icon: createMarkerIcon(color) // Pass the color to the createMarkerIcon function
//                 });
//                 // Optionally, you can customize the marker icon or add a tooltip
//                 // lastMarker.setIcon(...);
//                 lastMarker.bindTooltip(`${user} (Last Known Position)`);
//
//                 // Add the last marker to the assetMarkers layer group
//                 assetMarkers.addLayer(lastMarker);
//                 console.log(`Last known position marker added for ${user}.`);
//             } else {
//                 console.log(`No valid position found for ${user}.`);
//             }
//         } catch (error) {
//             console.error(`Error loading asset data for ${user}.csv:`, error);
//         }
//     }
//
//     // Add the layer group containing all last position markers to the map
//     map.addLayer(assetMarkers);
//     console.log("All last position markers added to the map.");
// }





// async function loadAssets() {
//     const checkboxes = document.querySelectorAll('.assets-checkbox:checked'); // Get all checked checkboxes
//
//     // Clear previous markers before fetching and adding new ones
//     assetMarkers.clearLayers();
//     console.log("Previous markers cleared.");
//
//     // Iterate over each checked checkbox
//     for (const checkbox of checkboxes) {
//         const user = checkbox.value; // Get the value of the checkbox (which corresponds to the user name)
//         const color = getRandomColor(); // Generate a random color for each checkbox
//
//         try {
//             const response = await fetch(`http://localhost:5000/static/data/${user}.csv`);
//             if (!response.ok) {
//                 throw new Error(`Failed to fetch ${user}.csv`);
//             }
//             const csvData = await response.text();
//
//             // Parse the CSV data
//             const rows = csvData.split('\n');
//
//             let lastLatitude, lastLongitude, lastScanTime; // Variables to store the last marker's coordinates and scan time
//             for (let i = 0; i < rows.length; i++) { // Start from index 1 to skip header row
//                 const row = rows[i];
//                 const columns = row.split(',');
//                 const latitude = parseFloat(columns[7]); // Assuming latitude is in first column
//                 const longitude = parseFloat(columns[8]); // Assuming longitude is in second column
//
//                 if (!isNaN(latitude) && !isNaN(longitude)) { // Check if latitude and longitude are valid numbers
//                     // Update the last marker's coordinates and scan time
//                     lastLatitude = latitude;
//                     lastLongitude = longitude;
//                     lastScanTime = new Date(); // Get the current system time
//                 }
//             }
//
//             // Create a marker for the last known position of the current file
//             if (!isNaN(lastLatitude) && !isNaN(lastLongitude)) {
//                 const lastMarker = L.marker([lastLatitude, lastLongitude], {
//                     icon: createMarkerIcon(color) // Pass the color to the createMarkerIcon function
//                 });
//                 // Optionally, you can customize the marker icon or add a tooltip
//                 // lastMarker.setIcon(...);
//                 lastMarker.bindTooltip(`${user} (Last Known Position - ${lastScanTime.toLocaleString()})`);
//
//                 // Add the last marker to the assetMarkers layer group
//                 assetMarkers.addLayer(lastMarker);
//                 console.log(`Last known position marker added for ${user} at ${lastScanTime}.`);
//             } else {
//                 console.log(`No valid position found for ${user}.`);
//             }
//         } catch (error) {
//             console.error(`Error loading asset data for ${user}.csv:`, error);
//         }
//     }
//
//     // Add the layer group containing all last position markers to the map
//     map.addLayer(assetMarkers);
//     console.log("All last position markers added to the map.");
//
//         // Display the last scanned times on the asset page
//     const lastScanTimesString = lastScanTimes.join(', ');
//     console.log("Last scanned times:", lastScanTimesString);
// }






////####below method is working
// async function loadAssets() {
//     const checkboxes = document.querySelectorAll('.assets-checkbox:checked'); // Get all checked checkboxes
//
//     // Clear previous markers before fetching and adding new ones
//     assetMarkers.clearLayers();
//     console.log("Previous markers cleared.");
//
//     // Array to store last scan times for each user
//     const lastScanTimes = [];
//
//     // Iterate over each checked checkbox
//     for (const checkbox of checkboxes) {
//         const user = checkbox.value; // Get the value of the checkbox (which corresponds to the user name)
//         const color = getRandomColor(); // Generate a random color for each checkbox
//
//         try {
//             const response = await fetch(`http://localhost:5000/static/data/${user}.csv`);
//             if (!response.ok) {
//                 throw new Error(`Failed to fetch ${user}.csv`);
//             }
//             const csvData = await response.text();
//
//             // Parse the CSV data
//             const rows = csvData.split('\n');
//
//             let lastLatitude, lastLongitude, lastScanTime; // Variables to store the last marker's coordinates and scan time
//             for (let i = 0; i < rows.length; i++) { // Start from index 1 to skip header row
//                 const row = rows[i];
//                 const columns = row.split(',');
//                 const latitude = parseFloat(columns[7]); // Assuming latitude is in first column
//                 const longitude = parseFloat(columns[8]); // Assuming longitude is in second column
//
//                 if (!isNaN(latitude) && !isNaN(longitude)) { // Check if latitude and longitude are valid numbers
//                     // Update the last marker's coordinates and scan time
//                     lastLatitude = latitude;
//                     lastLongitude = longitude;
//                     lastScanTime = new Date(); // Get the current system time
//                 }
//             }
//
//             // Create a marker for the last known position of the current file
//             if (!isNaN(lastLatitude) && !isNaN(lastLongitude)) {
//                 const lastMarker = L.marker([lastLatitude, lastLongitude], {
//                     icon: createMarkerIcon(color) // Pass the color to the createMarkerIcon function
//                 });
//                 // Optionally, you can customize the marker icon or add a tooltip
//                 // lastMarker.setIcon(...);
//                 lastMarker.bindTooltip(`${user} (Last Known Position - ${lastScanTime.toLocaleString()})`);
//
//                 // Add the last marker to the assetMarkers layer group
//                 assetMarkers.addLayer(lastMarker);
//                 console.log(`Last known position marker added for ${user} at ${lastScanTime}.`);
//             } else {
//                 console.log(`No valid position found for ${user}.`);
//             }
//
//             // Store the last scan time for the current user
//             lastScanTimes.push(`${user}: ${lastScanTime.toLocaleString()}`);
//
//         } catch (error) {
//             console.error(`Error loading asset data for ${user}.csv:`, error);
//         }
//     }
//
//     // Add the layer group containing all last position markers to the map
//     map.addLayer(assetMarkers);
//     console.log("All last position markers added to the map.");
//
//     // Display the last scanned times on the asset page
//     const lastScanTimesString = lastScanTimes.join(',\n');
//     console.log("Last scanned times:", lastScanTimesString);
//
//     // Update HTML container with last scan times
//     const lastScanTimesContainer = document.getElementById('lastScanTimesContainer');
//     if (lastScanTimesContainer) {
//         // Clear existing content
//         lastScanTimesContainer.innerHTML = '';
//
//         // Split the string by newline characters and create a div for each entry
//         lastScanTimesString.split('\n').forEach(entry => {
//             const div = document.createElement('div');
//             div.textContent = entry;
//             lastScanTimesContainer.appendChild(div);
//         });
//     } else {
//         console.error("Error: Could not find lastScanTimesContainer element in HTML.");
//     }
//
//     //     // Save last scanned times to localStorage
//     // localStorage.setItem('lastScanTimes', JSON.stringify(lastScanTimes));
//     //
//     // // Redirect to asset.html
//     // window.location.href = 'asset.html';
//
//     // // Assuming csvData is your CSV data as a string
//     // localStorage.setItem('csvData', csvData);
//     // window.location.href = 'asset.html';
//
//     // <a href="/assets?file=data_1.csv">View Asset Data</a>
//
//
// }





// async function loadAssets() {
//     const checkboxes = document.querySelectorAll('.assets-checkbox:checked'); // Get all checked checkboxes
//
//     // Clear previous markers before fetching and adding new ones
//     assetMarkers.clearLayers();
//     console.log("Previous markers cleared.");
//
//     // Array to store last scan times for each user
//     const lastScanTimes = [];
//
//     // Iterate over each checked checkbox
//     for (const checkbox of checkboxes) {
//         const user = checkbox.value; // Get the value of the checkbox (which corresponds to the user name)
//         const color = getRandomColor(); // Generate a random color for each checkbox
//
//         try {
//             const response = await fetch(`http://localhost:5000/static/data/${user}.csv`);
//             if (!response.ok) {
//                 throw new Error(`Failed to fetch ${user}.csv`);
//             }
//             const csvData = await response.text();
//
//             // Parse the CSV data
//             const rows = csvData.split('\n');
//
//             let lastLatitude, lastLongitude, lastScanTime; // Variables to store the last marker's coordinates and scan time
//             for (let i = 0; i < rows.length; i++) { // Start from index 1 to skip header row
//                 const row = rows[i];
//                 const columns = row.split(',');
//                 const latitude = parseFloat(columns[7]); // Assuming latitude is in first column
//                 const longitude = parseFloat(columns[8]); // Assuming longitude is in second column
//
//                 if (!isNaN(latitude) && !isNaN(longitude)) { // Check if latitude and longitude are valid numbers
//                     // Update the last marker's coordinates and scan time
//                     lastLatitude = latitude;
//                     lastLongitude = longitude;
//                     lastScanTime = new Date(); // Get the current system time
//                 }
//             }
//
//             // Create a marker for the last known position of the current file
//             if (!isNaN(lastLatitude) && !isNaN(lastLongitude)) {
//                 const lastMarker = L.marker([lastLatitude, lastLongitude], {
//                     icon: createMarkerIcon(color) // Pass the color to the createMarkerIcon function
//                 });
//                 // Optionally, you can customize the marker icon or add a tooltip
//                 // lastMarker.setIcon(...);
//                 lastMarker.bindTooltip(`${user} (Last Known Position - ${lastScanTime.toLocaleString()})`);
//
//                 // Add the last marker to the assetMarkers layer group
//                 assetMarkers.addLayer(lastMarker);
//                 console.log(`Last known position marker added for ${user} at ${lastScanTime}.`);
//             } else {
//                 console.log(`No valid position found for ${user}.`);
//             }
//
//             // Store the last scan time for the current user
//             // lastScanTimes.push(`${user}: ${lastScanTime.toLocaleString()}`);
//             // lastScanTimes.push(`${user};${lastScanTime.toLocaleDateString()}-${lastScanTime.toLocaleTimeString()}`);
//             // Store the last scan time for the current user
//             const formattedTime = `${lastScanTime.getFullYear()}-${(lastScanTime.getMonth() + 1).toString().padStart(2, '0')}-${lastScanTime.getDate().toString().padStart(2, '0')} ${lastScanTime.getHours().toString().padStart(2, '0')}:${lastScanTime.getMinutes().toString().padStart(2, '0')}:${lastScanTime.getSeconds().toString().padStart(2, '0')}`;
//             lastScanTimes.push(`${user};${formattedTime}`);
//
//
//
//
//         } catch (error) {
//             console.error(`Error loading asset data for ${user}.csv:`, error);
//         }
//     }
//
//     // Add the layer group containing all last position markers to the map
//     map.addLayer(assetMarkers);
//     console.log("All last position markers added to the map.");
//
//     // Save last scanned times to localStorage
//     localStorage.setItem('lastScanTimes', JSON.stringify(lastScanTimes));
//
//     // Display the last scanned times on the current page
//     const lastScanTimesString = lastScanTimes.join(',\n');
//     console.log("Last scanned times:", lastScanTimesString);
//
//     // Update HTML container with last scan times
//     const lastScanTimesContainer = document.getElementById('lastScanTimesContainer');
//     if (lastScanTimesContainer) {
//         // Clear existing content
//         lastScanTimesContainer.innerHTML = '';
//
//         // Split the string by newline characters and create a div for each entry
//         lastScanTimesString.split('\n').forEach(entry => {
//             const div = document.createElement('div');
//             div.textContent = entry;
//             lastScanTimesContainer.appendChild(div);
//         });
//     } else {
//         console.error("Error: Could not find lastScanTimesContainer element in HTML.");
//     }
// }



// async function loadAssets() {
//     const checkboxes = document.querySelectorAll('.assets-checkbox:checked'); // Get all checked checkboxes
//
//     // Clear previous markers before fetching and adding new ones
//     assetMarkers.clearLayers();
//     console.log("Previous markers cleared.");
//
//     // Array to store last scan times for each user
//     const lastScanTimes = [];
//
//     // Iterate over each checked checkbox
//     for (const checkbox of checkboxes) {
//         const user = checkbox.value; // Get the value of the checkbox (which corresponds to the user name)
//         const color = getRandomColor(); // Generate a random color for each checkbox
//
//         try {
//             const response = await fetch(`http://localhost:5000/static/data/${user}.csv`);
//             if (!response.ok) {
//                 throw new Error(`Failed to fetch ${user}.csv`);
//             }
//             const csvData = await response.text();
//
//             // Parse the CSV data
//             const rows = csvData.split('\n');
//
//             // Display all positions at a slow rate
//             for (let i = 0; i < rows.length; i++) { // Start from index 1 to skip header row
//                 const row = rows[i];
//                 const columns = row.split(',');
//                 const latitude = parseFloat(columns[7]); // Assuming latitude is in first column
//                 const longitude = parseFloat(columns[8]); // Assuming longitude is in second column
//
//                 if (!isNaN(latitude) && !isNaN(longitude)) { // Check if latitude and longitude are valid numbers
//                     // Create a marker for each position found in the CSV data
//                     const marker = L.marker([latitude, longitude], {
//                         icon: createMarkerIcon(color) // Pass the color to the createMarkerIcon function
//                     });
//                     marker.bindTooltip(`${user} (Position)`);
//                     assetMarkers.addLayer(marker);
//                     console.log(`Position marker added for ${user} at (${latitude}, ${longitude}).`);
//
//                     // Wait for a short delay to display each position
//                     await new Promise(resolve => setTimeout(resolve, 1000)); // Adjust the delay time as needed
//                 }
//             }
//
//             // Store the last scan time for the current user
//             const lastScanTime = new Date(); // Get the current system time
//             const formattedTime = `${lastScanTime.getFullYear()}-${(lastScanTime.getMonth() + 1).toString().padStart(2, '0')}-${lastScanTime.getDate().toString().padStart(2, '0')} ${lastScanTime.getHours().toString().padStart(2, '0')}:${lastScanTime.getMinutes().toString().padStart(2, '0')}:${lastScanTime.getSeconds().toString().padStart(2, '0')}`;
//             lastScanTimes.push(`${user};${formattedTime}`);
//
//         } catch (error) {
//             console.error(`Error loading asset data for ${user}.csv:`, error);
//         }
//     }
//
//     // Add the layer group containing all position markers to the map
//     map.addLayer(assetMarkers);
//     console.log("All position markers added to the map.");
//
//     // Save last scanned times to localStorage
//     localStorage.setItem('lastScanTimes', JSON.stringify(lastScanTimes));
//
//     // Display only the last position markers on the map
//     showOnlyLastPositions();
//
//     // Display the last scanned times on the current page
//     const lastScanTimesString = lastScanTimes.join(',\n');
//     console.log("Last scanned times:", lastScanTimesString);
//
//     // Update HTML container with last scan times
//     const lastScanTimesContainer = document.getElementById('lastScanTimesContainer');
//     if (lastScanTimesContainer) {
//         // Clear existing content
//         lastScanTimesContainer.innerHTML = '';
//
//         // Split the string by newline characters and create a div for each entry
//         lastScanTimesString.split('\n').forEach(entry => {
//             const div = document.createElement('div');
//             div.textContent = entry;
//             lastScanTimesContainer.appendChild(div);
//         });
//     } else {
//         console.error("Error: Could not find lastScanTimesContainer element in HTML.");
//     }
// }
//
// // Function to show only the last position markers on the map
// function showOnlyLastPositions() {
//     // Iterate over all layers in the assetMarkers layer group
//     assetMarkers.eachLayer(marker => {
//         // Remove all markers except the last one
//         if (marker !== assetMarkers.getLayers()[assetMarkers.getLayers().length - 1]) {
//             assetMarkers.removeLayer(marker);
//         }
//     });
//     console.log("Only last position markers displayed on the map.");
// }



async function loadAssets() {
    const checkboxes = document.querySelectorAll('.assets-checkbox:checked'); // Get all checked checkboxes

    // Clear previous markers before fetching and adding new ones
    assetMarkers.clearLayers();
    console.log("Previous markers cleared.");

    // Array to store last scan times for each user
    const lastScanTimes = [];

    // Iterate over each checked checkbox
    for (const checkbox of checkboxes) {
        const user = checkbox.value; // Get the value of the checkbox (which corresponds to the user name)
        const color = getRandomColor(); // Generate a random color for each checkbox

        try {
            const response = await fetch(`http://localhost:5000/static/data/${user}.csv`);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${user}.csv`);
            }
            const csvData = await response.text();

            // Parse the CSV data
            const rows = csvData.split('\n');

            // Display all positions at a slow rate
            for (let i = 0; i < rows.length; i++) { // Start from index 1 to skip header row
                const row = rows[i];
                const columns = row.split(',');
                const latitude = parseFloat(columns[7]); // Assuming latitude is in first column
                const longitude = parseFloat(columns[8]); // Assuming longitude is in second column

                if (!isNaN(latitude) && !isNaN(longitude)) { // Check if latitude and longitude are valid numbers
                    // Create a marker for each position found in the CSV data
                    const marker = L.marker([latitude, longitude], {
                        icon: createMarkerIcon(color) // Pass the color to the createMarkerIcon function
                    });
                    marker.bindTooltip(`${user} (Position)`);
                    assetMarkers.addLayer(marker);
                    console.log(`Position marker added for ${user} at (${latitude},${longitude}).`);

                    // Remove all markers except the last one
                    removePreviousMarkers();

                    // Wait for a short delay to display each position
                    await new Promise(resolve => setTimeout(resolve, 800)); // Adjust the delay time as needed
                }
            }

            // Store the last scan time for the current user
            const lastScanTime = new Date(); // Get the current system time
            const formattedTime = `${lastScanTime.getFullYear()}-${(lastScanTime.getMonth() + 1).toString().padStart(2, '0')}-${lastScanTime.getDate().toString().padStart(2, '0')} ${lastScanTime.getHours().toString().padStart(2, '0')}:${lastScanTime.getMinutes().toString().padStart(2, '0')}:${lastScanTime.getSeconds().toString().padStart(2, '0')}`;
            lastScanTimes.push(`${user};${formattedTime}`);

        } catch (error) {
            console.error(`Error loading asset data for ${user}.csv:`, error);
        }
    }

    // Add the layer group containing all position markers to the map
    map.addLayer(assetMarkers);
    console.log("All position markers added to the map.");

    // Save last scanned times to localStorage
    localStorage.setItem('lastScanTimes', JSON.stringify(lastScanTimes));

    // Display the last scanned times on the current page
    const lastScanTimesString = lastScanTimes.join(',\n');
    console.log("Last scanned times:", lastScanTimesString);

    // Update HTML container with last scan times
    const lastScanTimesContainer = document.getElementById('lastScanTimesContainer');
    if (lastScanTimesContainer) {
        // Clear existing content
        lastScanTimesContainer.innerHTML = '';

        // Split the string by newline characters and create a div for each entry
        lastScanTimesString.split('\n').forEach(entry => {
            const div = document.createElement('div');
            div.textContent = entry;
            lastScanTimesContainer.appendChild(div);
        });
    } else {
        console.error("Error: Could not find lastScanTimesContainer element in HTML.");
    }
}

// Function to remove all markers except the last one
function removePreviousMarkers() {
    const allLayers = assetMarkers.getLayers();
    if (allLayers.length > 1) {
        for (let i = 0; i < allLayers.length - 1; i++) {
            assetMarkers.removeLayer(allLayers[i]);
        }
        console.log("Previous markers removed except the last one.");
    }
}









// Attach the loadAssets function to the click event of the "Assets" button
// document.getElementById('assetButton').addEventListener('click', loadAssets);

// Function to clear all assets from the map
function clearAssets() {
    // Remove all asset markers from the map
    assetMarkers.clearLayers();


    // Clear the last scanned times display
    const lastScanTimesContainer = document.getElementById('lastScanTimesContainer');
    if (lastScanTimesContainer) {
        lastScanTimesContainer.textContent = '';
    } else {
        console.error("Error: Could not find lastScanTimesContainer element in HTML.");
    }


    // Uncheck all checked checkboxes
    const checkboxes = document.querySelectorAll('.assets-checkbox:checked');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });

}

// Attach the clearAssets function to a button or event to trigger it
document.getElementById('clearAssetsButton').addEventListener('click', clearAssets);










// LivedFeed Asset Checkboxes

function createCheckboxesForLiveFeedAsset(totalFiles) {
    var checkboxContainer = document.getElementById('checkboxes_LiveFeedAssetSection');
    checkboxContainer.innerHTML = '';

    for (var i = 1; i <= totalFiles; i++) {
        var user = `data_${i}`;
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `checkbox_${user}`;
        checkbox.name = user;
        checkbox.className = 'checkbox-LiveFeedAssets'; // Corrected class name here
        checkbox.value = user;  // Set the user name as the value

        const textContent = document.createTextNode(user);

        label.appendChild(checkbox);
        label.appendChild(textContent);

        checkboxContainer.appendChild(label);
    }

    // Attach the handleCheckboxChange function to checkbox change events
    var checkboxes = document.getElementsByClassName('checkbox-LiveFeedAssets'); // Corrected class name here
    for (var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].addEventListener('change', handleCheckboxChange);
    }
}




//
// async function StartLiveFeedAsset() {
//     const checkboxes = document.querySelectorAll('#LiveFeedAssetSection input[type="checkbox"]:checked');
//
//     if (checkboxes.length === 0) {
//         console.log("No assets selected.");
//         return;
//     }
//
//     // Clear previous markers before fetching and adding new ones
//     assetMarkers.clearLayers();
//     console.log("Previous markers cleared.");
//
//     // Iterate over each checked checkbox
//     for (const checkbox of checkboxes) {
//         const user = checkbox.value;
//         const color = getRandomColor();
//
//         try {
//             const response = await fetch(`http://localhost:5000/static/data/${user}.csv`);
//             if (!response.ok) {
//                 throw new Error(`Failed to fetch ${user}.csv`);
//             }
//             const csvData = await response.text();
//             const rows = csvData.split('\n');
//
//             // Display all positions at a slow rate
//             for (let i = 0; i < rows.length; i++) {
//                 if (paused) {
//                     await new Promise(resolve => setTimeout(resolve, 500)); // Delay for a paused live feed
//                     continue; // Skip adding new markers if paused
//                 }
//
//                 const row = rows[i];
//                 const columns = row.split(',');
//                 const latitude = parseFloat(columns[7]);
//                 const longitude = parseFloat(columns[8]);
//
//                 if (!isNaN(latitude) && !isNaN(longitude)) {
//                     const marker = L.marker([latitude, longitude], {
//                         icon: createMarkerIcon(color)
//                     });
//                     marker.bindTooltip(`${user} (Position)`);
//                     assetMarkers.addLayer(marker);
//                     console.log(`Position marker added for ${user} at (${latitude}, ${longitude}).`);
//                 }
//                 await new Promise(resolve => setTimeout(resolve, 800)); // Delay between each position
//             }
//
//             // Display the markers on the map after processing each user's data
//             map.addLayer(assetMarkers);
//             console.log("All position markers added to the map.");
//         } catch (error) {
//             console.error(`Error loading asset data for ${user}.csv:`, error);
//         }
//     }
// }
//
//
//
//
//
//
// let paused = false; // Flag to control pause/resume state
//
// function pauseStop() {
//     if (paused) {
//         paused = false; // Resume live feed
//         console.log("Live feed resumed.");
//     } else {
//         paused = true; // Pause live feed
//         console.log("Live feed paused.");
//         // Call a function to stop the trajectory (e.g., stopTrajectory())
//     }
// }





// let paused = false; // Flag to control pause/resume state
// let currentIndex = 0; // Keep track of the current index in the CSV data
// let timeoutId; // Store the timeout ID for pausing/resuming
//
// async function StartLiveFeedAsset() {
//     const checkboxes = document.querySelectorAll('#LiveFeedAssetSection input[type="checkbox"]:checked');
//
//     if (checkboxes.length === 0) {
//         console.log("No assets selected.");
//         return;
//     }
//
//     // Clear previous markers before fetching and adding new ones
//     assetMarkers.clearLayers();
//     console.log("Previous markers cleared.");
//
//     // Reset the currentIndex when starting a new live feed
//     currentIndex = 0;
//
//     // Iterate over each checked checkbox
//     for (const checkbox of checkboxes) {
//         const user = checkbox.value;
//         const color = getRandomColor();
//
//         try {
//             const response = await fetch(`http://localhost:5000/static/data/${user}.csv`);
//             if (!response.ok) {
//                 throw new Error(`Failed to fetch ${user}.csv`);
//             }
//             const csvData = await response.text();
//             const rows = csvData.split('\n');
//
//             // Process CSV data
//             await processCSVData(rows, user, color);
//         } catch (error) {
//             console.error(`Error loading asset data for ${user}.csv:`, error);
//         }
//     }
//
//     // Display the markers on the map after processing all user data
//     map.addLayer(assetMarkers);
//     console.log("All position markers added to the map.");
// }
//
// async function processCSVData(rows, user, color) {
//     return new Promise(async (resolve) => {
//         for (let i = currentIndex; i < rows.length; i++) {
//             // Check if the pause button is pressed
//             while (paused) {
//                 await new Promise(resolve => setTimeout(resolve, 500)); // Delay for a paused live feed
//             }
//
//             const row = rows[i];
//             const columns = row.split(',');
//             const latitude = parseFloat(columns[7]);
//             const longitude = parseFloat(columns[8]);
//
//             if (!isNaN(latitude) && !isNaN(longitude)) {
//                 const marker = L.marker([latitude, longitude], {
//                     icon: createMarkerIcon(color)
//                 });
//                 marker.bindTooltip(`${user} (Position)`);
//                 assetMarkers.addLayer(marker);
//                 console.log(`Position marker added for ${user} at (${latitude}, ${longitude}).`);
//             }
//
//             await new Promise(resolve => setTimeout(resolve, 800)); // Delay between each position
//
//             // Update currentIndex after processing each row
//             currentIndex = i + 1;
//         }
//
//         resolve();
//     });
// }
//
// function pauseStop() {
//     paused = !paused; // Toggle the paused state
//     console.log(paused ? "Live feed paused." : "Live feed resumed.");
// }





let paused = false; // Flag to control pause/resume state
let currentIndex = 0; // Keep track of the current index in the CSV data
let timeoutId; // Store the timeout ID for pausing/resuming
let trajectoryActive = true; // Flag to control trajectory processing



async function StartLiveFeedAsset() {
    // if (!trajectoryActive) {
    //     console.log("Trajectory is not active. Live feed asset cannot be started.");
    //     return;
    // }
    trajectoryActive = true;



    const checkboxes = document.querySelectorAll('#LiveFeedAssetSection input[type="checkbox"]:checked');

    if (checkboxes.length === 0) {
        console.log("No assets selected.");
        return;
    }

    // Clear previous markers before fetching and adding new ones
    assetMarkers.clearLayers();
    console.log("Previous markers cleared.");

    // Reset the currentIndex when starting a new live feed
    currentIndex = 0;

    // Iterate over each checked checkbox
    for (const checkbox of checkboxes) {
        const user = checkbox.value;
        const color = getRandomColor();

        try {
            const response = await fetch(`http://localhost:5000/static/data/${user}.csv`);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${user}.csv`);
            }
            const csvData = await response.text();
            const rows = csvData.split('\n');

            // Process CSV data
            await processCSVData(rows, user, color);
        } catch (error) {
            console.error(`Error loading asset data for ${user}.csv:`, error);
        }
    }

    // Display the markers on the map after processing all user data
    map.addLayer(assetMarkers);
    console.log("All position markers added to the map.");
}






// async function processCSVData(rows, user, color) {
//     for (let i = currentIndex; i < rows.length; i++) {
//         // Check if the pause button is pressed
//         while (paused) {
//             await delay(500); // Delay for a paused live feed
//         }
//
//         const row = rows[i];
//         const columns = row.split(',');
//         const latitude = parseFloat(columns[7]);
//         const longitude = parseFloat(columns[8]);
//
//         if (!isNaN(latitude) && !isNaN(longitude)) {
//             const marker = L.marker([latitude, longitude], {
//                 icon: createMarkerIcon(color)
//             });
//             marker.bindTooltip(`${user} (Position)`);
//             assetMarkers.addLayer(marker);
//             map.addLayer(assetMarkers);
//
//             console.log(`Position marker added for ${user} at (${latitude}, ${longitude}).`);
//         }
//
//         // Delay between each position
//         await delay(400);
//
//         // Update currentIndex after processing each row
//         currentIndex = i + 1;
//     }
// }



async function processCSVData(rows, user, color) {
    for (let i = currentIndex; i < rows.length; i++) {
        // Check if the pause button is pressed
        while (paused) {
            await delay(500); // Delay for a paused live feed
        }

        // Check if trajectory processing should continue
        if (!trajectoryActive) {
            console.log("Trajectory processing stopped.");
            return; // Exit the function if trajectory processing should stop
        }

        const row = rows[i];
        const columns = row.split(',');
        const latitude = parseFloat(columns[7]);
        const longitude = parseFloat(columns[8]);

        if (!isNaN(latitude) && !isNaN(longitude)) {
            const marker = L.marker([latitude, longitude], {
                icon: createMarkerIcon(color)
            });
            marker.bindTooltip(`${user} (Position)`);
            assetMarkers.addLayer(marker);
            map.addLayer(assetMarkers);

            console.log(`Position marker added for ${user} at (${latitude}, ${longitude}).`);
        }

        // Delay between each position
        await delay(400);

        // Update currentIndex after processing each row
        currentIndex = i + 1;
    }
}



function pauseStop() {
    paused = !paused; // Toggle the paused state
    console.log(paused ? "Live feed paused." : "Live feed resumed.");
}

// Utility function to delay execution
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}





/////aseets starts


let assetImageMarker = null; // Store the reference to the asset image marker

async function FindAsset() {

    if (assetImageMarker) {
        // Remove the previous asset image marker if it exists
        map.removeLayer(assetImageMarker);
    }

    // Get the current position from the live feed
    const currentPosition = getCurrentPosition();

    if (currentPosition) {
        // Add the asset image marker at the current position
        const assetImageIcon = L.icon({
            iconUrl: 'http://localhost:5000/static/img/asset_img.png', // Specify the path to your asset image
            iconSize: [10, 10], // Adjust the size if needed
            iconAnchor: [5, 5], // Adjust the anchor if needed
        });

        assetImageMarker = L.marker(currentPosition, {
            icon: assetImageIcon,
        }).addTo(map);

        // Store the last scan time for the current user
        const lastScanTime = new Date(); // Get the current system time
        const formattedTime = `${lastScanTime.getFullYear()}-${(lastScanTime.getMonth() + 1).toString().padStart(2, '0')}-${lastScanTime.getDate().toString().padStart(2, '0')} ${lastScanTime.getHours().toString().padStart(2, '0')}:${lastScanTime.getMinutes().toString().padStart(2, '0')}:${lastScanTime.getSeconds().toString().padStart(2, '0')}`;
        const user = document.querySelector('#LiveFeedAssetSection input[type="checkbox"]:checked').value;
        const latitude = currentPosition.lat;
        const longitude = currentPosition.lng;

        const userData = {
            user: user,
            lastScanTime: formattedTime,
            latitude: latitude,
            longitude: longitude
        };
        assetImageMarker.bindTooltip(`Asset found for ${user} at Lat_Long: ${currentPosition}, Last Scan Time: ${formattedTime}`);


        // assetImageMarker.bindTooltip(`Asset found at Lat_Long: ${currentPosition}, Last Scan Time: ${formattedTime}`);

        // localStorage.setItem('lastLiveFeedAssetScanTime', JSON.stringify(formattedTime));
        // localStorage.setItem('lastLiveFeedAssetScanTime', userData);
        localStorage.setItem('lastLiveFeedAssetScanTime', JSON.stringify(userData));



        // Display the last scanned times on the current page
        const lastScanTimesString = localStorage.getItem('lastLiveFeedAssetScanTime');

        // Update HTML container with last scan times
        const lastLiveFeedAssetScanTimeContainer = document.getElementById('lastLiveFeedAssetScanTimeContainer');
        if (lastLiveFeedAssetScanTimeContainer) {
            // Clear existing content
            lastLiveFeedAssetScanTimeContainer.innerHTML = '';

            // Create a div for the last scan time entry
            const div = document.createElement('div');
            div.textContent = lastScanTimesString || 'No last scan time available';
            lastLiveFeedAssetScanTimeContainer.appendChild(div);
        } else {
            console.error("Error: Could not find lastLiveFeedAssetScanTimeContainer element in HTML.");
        }



        console.log("Asset image marker added at current position:", currentPosition);
    } else {
        console.log("No position available to mark as asset.");
    }
}




/*
let assetImageMarkers = []; // Store the references to the asset image markers
let assetList = []; // Store the list of assets

async function FindAsset() {
    // Get the current position from the live feed
    const currentPosition = getCurrentPosition();

    if (currentPosition) {
        // Add the asset image marker at the current position
        const assetImageIcon = L.icon({
            iconUrl: 'http://localhost:5000/static/img/asset_img.png', // Specify the path to your asset image
            iconSize: [10, 10], // Adjust the size if needed
            iconAnchor: [5, 5], // Adjust the anchor if needed
        });

        const assetImageMarker = L.marker(currentPosition, {
            icon: assetImageIcon,
        }).addTo(map);

        // Store the last scan time for the current user
        const lastScanTime = new Date(); // Get the current system time
        const formattedTime = `${lastScanTime.getFullYear()}-${(lastScanTime.getMonth() + 1).toString().padStart(2, '0')}-${lastScanTime.getDate().toString().padStart(2, '0')} ${lastScanTime.getHours().toString().padStart(2, '0')}:${lastScanTime.getMinutes().toString().padStart(2, '0')}:${lastScanTime.getSeconds().toString().padStart(2, '0')}`;
        const user = document.querySelector('#LiveFeedAssetSection input[type="checkbox"]:checked').value;
        const latitude = currentPosition.lat;
        const longitude = currentPosition.lng;

        const userData = {
            user: user,
            lastScanTime: formattedTime,
            latitude: latitude,
            longitude: longitude
        };

        assetImageMarker.bindTooltip(`Asset found for ${user} at Lat_Long: ${currentPosition}, Last Scan Time: ${formattedTime}`);

        // Add the asset data to the list
        assetList.push(userData);

        // Add the marker to the array
        assetImageMarkers.push(assetImageMarker);

        // Update the UI with the asset list
        updateAssetListUI();
    } else {
        console.log("No position available to mark as asset.");
    }
}

function updateAssetListUI() {
    // Get the container for asset list
    const assetListContainer = document.getElementById('assetListContainer');

    // Clear existing content
    assetListContainer.innerHTML = '';

    // Create a table element
    const table = document.createElement('table');
    table.classList.add('asset-table');

    // Create table headers
    const headers = ['Asset ID', 'User', 'Last Scan Time', 'Latitude', 'Longitude'];
    const headerRow = document.createElement('tr');
    headers.forEach(headerText => {
        const headerCell = document.createElement('th');
        headerCell.textContent = headerText;
        headerRow.appendChild(headerCell);
    });
    table.appendChild(headerRow);

    // Create rows for each asset
    assetList.forEach((asset, index) => {
        const row = document.createElement('tr');
        const assetIDCell = document.createElement('td');
        assetIDCell.textContent = `Asset ${index + 1}`;
        row.appendChild(assetIDCell);

        // Populate other cells with asset data
        Object.values(asset).forEach(value => {
            const cell = document.createElement('td');
            cell.textContent = value;
            row.appendChild(cell);
        });

        table.appendChild(row);
    });

    // Append the table to the container
    assetListContainer.appendChild(table);
}

*/




// Utility function to get the current position from the live feed
function getCurrentPosition() {
    // Implement this function based on your current implementation
    // For example, if you have access to the current position directly, return it
    // Otherwise, you may need to modify the existing code to store and retrieve the current position
    // Here, I'm assuming there's some way to get the current position, such as accessing the last added marker
    const lastMarker = assetMarkers.getLayers()[assetMarkers.getLayers().length - 1];
    if (lastMarker) {
        return lastMarker.getLatLng();
    } else {
        return null;
    }
}




///// assets ends









// function ClearTrajectory() {
//     // Remove all asset markers from the map
//     assetMarkers.clearLayers();
//
//     // Remove the asset image marker from the map
//     if (assetImageMarker) {
//         map.removeLayer(assetImageMarker);
//         assetImageMarker = null; // Reset the asset image marker
//     }
//
//     // Reset the pause/stop button
//     paused = false;
//
//
//     // Uncheck all checked checkboxes
//     const checkboxes = document.querySelectorAll('#LiveFeedAssetSection input[type="checkbox"]:checked');
//     checkboxes.forEach(checkbox => {
//         checkbox.checked = false;
//     });
//
// }


// let trajectoryActive = true; // Flag to control trajectory processing
//
// async function ClearTrajectory() {
//     // Remove all asset markers from the map
//     assetMarkers.clearLayers();
//
//     // Remove the asset image marker from the map
//     if (assetImageMarker) {
//         map.removeLayer(assetImageMarker);
//         assetImageMarker = null; // Reset the asset image marker
//     }
//
//     // Reset the pause/stop button
//     paused = false;
//
//     currentIndex = 0;
//
//     // Uncheck all checked checkboxes
//     const checkboxes = document.querySelectorAll('#LiveFeedAssetSection input[type="checkbox"]:checked');
//     checkboxes.forEach(checkbox => {
//         checkbox.checked = false;
//     });
//
//     // Start live feed asset again
//     StartLiveFeedAsset();
//
//     await delay(1000); // Adjust the delay time if needed
//
//
//     // Stop trajectory processing
//     trajectoryActive = false;
//
//     console.log("Trajectory cleared.");
// }
//




// async function ClearTrajectory() {
//     console.log("Clearing trajectory...");
//
//     // Remove all asset markers from the map
//     assetMarkers.clearLayers();
//
//     // Remove the asset image marker from the map
//     if (assetImageMarker) {
//         map.removeLayer(assetImageMarker);
//         assetImageMarker = null; // Reset the asset image marker
//     }
//
//     // Reset the pause/stop button
//     paused = false;
//
//     currentIndex = 0;
//
//     // Uncheck all checked checkboxes
//     const checkboxes = document.querySelectorAll('#LiveFeedAssetSection input[type="checkbox"]:checked');
//     checkboxes.forEach(checkbox => {
//         checkbox.checked = false;
//     });
//
//     // Reset trajectoryActive flag
//     trajectoryActive = true;
//
//     console.log("Starting live feed asset again...");
//
//     // Start live feed asset again after a delay
//     await delay(1000); // Adjust the delay time if needed
//     await StartLiveFeedAsset(); // Wait for StartLiveFeedAsset to finish
//
//     console.log("Trajectory cleared.");
// }



// async function ClearTrajectory() {
//     // Stop trajectory processing
//     trajectoryActive = false;
//
//     // Remove all asset markers from the map
//     assetMarkers.clearLayers();
//
//     // Remove the asset image marker from the map
//     if (assetImageMarker) {
//         map.removeLayer(assetImageMarker);
//         assetImageMarker = null; // Reset the asset image marker
//     }
//
//     // Reset the pause/stop button
//     paused = false;
//
//     // Reset the currentIndex
//     currentIndex = 0;
//
//     // Uncheck all checked checkboxes
//     const checkboxes = document.querySelectorAll('#LiveFeedAssetSection input[type="checkbox"]:checked');
//     checkboxes.forEach(checkbox => {
//         checkbox.checked = false;
//     });
//
//     console.log("Trajectory cleared.");
// }



// async function ClearTrajectory() {
//     console.log("Clearing trajectory...");
//
//     // Stop trajectory processing
//     trajectoryActive = false;
//
//     // Remove all asset markers from the map
//     assetMarkers.clearLayers();
//
//     // Remove the asset image marker from the map
//     if (assetImageMarker) {
//         map.removeLayer(assetImageMarker);
//         assetImageMarker = null; // Reset the asset image marker
//     }
//
//     // Reset the pause/stop button
//     paused = false;
//
//     // Reset the currentIndex
//     currentIndex = 0;
//
//     // Uncheck all checked checkboxes
//     const checkboxes = document.querySelectorAll('#LiveFeedAssetSection input[type="checkbox"]:checked');
//
//     checkboxes.forEach(checkbox => {
//         checkbox.checked = false;
//     });
//
//     console.log("Trajectory cleared.");
//
//     console.log("Starting live feed asset again...");
//
//     // Start live feed asset again after a delay
//     await delay(5000); // Adjust the delay time if needed
//     await StartLiveFeedAsset(); // Wait for StartLiveFeedAsset to finish
// }




async function restartLiveFeedAsset() {
    // Start live feed asset again after a delay
    await delay(1000); // Adjust the delay time if needed
    await StartLiveFeedAsset(); // Wait for StartLiveFeedAsset to finish
}

// async function ClearTrajectory() {
//     console.log("Clearing trajectory...");
//
//     // Remove all asset markers from the map
//     assetMarkers.clearLayers();
//
//     // Remove the asset image marker from the map
//     if (assetImageMarker) {
//         map.removeLayer(assetImageMarker);
//         assetImageMarker = null; // Reset the asset image marker
//     }
//
//     // Reset the pause/stop button
//     paused = false;
//
//     currentIndex = 0;
//
//     // Uncheck all checked checkboxes
//     const checkboxes = document.querySelectorAll('#LiveFeedAssetSection input[type="checkbox"]:checked');
//     checkboxes.forEach(checkbox => {
//         checkbox.checked = false;
//     });
//
//     // Reset trajectoryActive flag
//     trajectoryActive = true;
//
//     console.log("Starting live feed asset again...");
//
//     // Call the function to restart the live feed asset
//     await restartLiveFeedAsset();
//
//     console.log("Trajectory cleared.");
// }




// async function ClearTrajectory() {
//     console.log("Clearing trajectory...");
//
//     // Stop trajectory processing
//     // trajectoryActive = true;
//
//     // Remove all asset markers from the map
//     assetMarkers.clearLayers();
//
//     // Remove the asset image marker from the map
//     if (assetImageMarker) {
//         map.removeLayer(assetImageMarker);
//         assetImageMarker = null; // Reset the asset image marker
//     }
//
//     // Reset the pause/stop button
//     paused = false;
//
//     // Reset the currentIndex
//     currentIndex = 0;
//
//     // Uncheck all checked checkboxes
//     const checkboxes = document.querySelectorAll('#LiveFeedAssetSection input[type="checkbox"]:checked');
//
//     checkboxes.forEach(checkbox => {
//         checkbox.checked = false;
//     });
//
//     // trajectoryActive = fasle;
//
//
//
//     console.log("Starting live feed asset again...");
//
//     await restartLiveFeedAsset();
//
//     console.log("Trajectory cleared.");
//
// }

async function ClearTrajectory() {
    console.log("Clearing trajectory...");

    // Stop trajectory processing
    trajectoryActive = false;

    // Remove all asset markers from the map
    assetMarkers.clearLayers();

    // Remove the asset image marker from the map
    if (assetImageMarker) {
        map.removeLayer(assetImageMarker);
        assetImageMarker = null; // Reset the asset image marker
    }

    // Reset the pause/stop button
    paused = false;

    // Reset the currentIndex
    currentIndex = 0;

    // Uncheck all checked checkboxes
    const checkboxes = document.querySelectorAll('#LiveFeedAssetSection input[type="checkbox"]:checked');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });

    console.log("Trajectory cleared.");
}


// Utility function to delay execution
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}










// Add Socket.IO script for real-time updates
var socket = io.connect('http://' + document.domain + ':' + location.port);

// socket.on('update_values', function (data) {
//     console.log('Values data updated:', data);
//     document.getElementById('latitude').innerText = data.latitude;
//     document.getElementById('longitude').innerText = data.longitude;
//     document.getElementById('floor-number').innerText = data.floorNumber;
// });

// // Update marker position
// socket.on('update_map', function (data) {
//     console.log('Map data updated:', data);
//     // on initialization marker movement
//     //marker.setLatLng([data.map.latitude, data.map.longitude]);
// });



// Update user information
socket.on('update_users_info', function (data) {
    // console.log('Users info updated:', data);
    var userList = document.getElementById('user-list');
    userList.innerHTML = ''; // Clear existing user list


    // this code displays data asap dashboards executes
    // // Update user information
    // for (var user in data.users) {
    //     var listItem = document.createElement('li');
    //     listItem.innerHTML = `<strong>${user}:</strong> ${data.users[user]}`;
    //     userList.appendChild(listItem);
    // }
});


socket.on('number_of_files', function (data) {
    createCheckboxes(data.totalFiles);
    createCheckboxesForAssets(data.totalFiles)
    createCheckboxesForLiveFeedAsset(data.totalFiles)
});


socket.on('update_users_info_for_checklist', function (data) {
    // console.log('Received totalFiles:', data.totalFiles);

    // Call createCheckboxes function with the totalFiles parameter
    createCheckboxes(data.totalFiles);
    createCheckboxesForAssets(data.totalFiles)
    createCheckboxesForLiveFeedAsset(data.totalFiles)

});

socket.on('file_content', function (data) {
    console.log('Received file content:', data.content);
    console.log('File Name:', data.file_name);

    // Display the content wherever you need in your UI
    // For example, you can update a div element with the content
    document.getElementById('csv-content-container').innerText = data.content;
});



socket.on('update_floor_data', function (data) {
    console.log('Floor data updated:', data.floorData);
    // Handle the floor data update as needed
});





// Update user markers for each floor
socket.on('update_user_markers', function (data) {
    // Clear existing markers
    markers.clearLayers();
    console.log("Selected Users Inside update_user_markers:", selected_users);

    // Add markers for each user
    for (var floor in data.markers) {
        console.log("User Markers Data:", data.markers);
        for (var user_id in data.markers[floor]) {
            console.log("Selected User Data inside for each loop:", user_id);
            var user_marker = data.markers[floor][user_id];
            var user_floor_color = Object.keys(floors).indexOf(floor) % 5; // Use Object.keys() to get array of floor names
            L.marker([user_marker.latitude, user_marker.longitude], {
                icon: createMarkerIcon(user_floor_color)
            }).addTo(map); // Make sure to add markers to the map, not just the layer group
        }
    }
});





// Mapping of user IDs to marker colors
var userColorMap = {};

// Function to create custom marker icon based on user identifier
function createMarkerIcon(user) {
    // Check if the user already has a color assigned
    if (!userColorMap.hasOwnProperty(user)) {
        // Generate a random color for the user
        var color = getRandomColor();
        // Assign the color to the user
        userColorMap[user] = color;
    }

    // Get the color for the user
    var color = userColorMap[user];

    // Create a div icon with the specified color
    return L.divIcon({
        className: 'user-marker',
        html: `<div style="background-color: ${color}; width: 5px; height: 5px; border-radius: 50%;"></div>`,
        iconSize: [5, 5], // Set icon size to 5x5 pixels
        iconAnchor: [2.5, 2.5], // Set icon anchor to center the dot
        popupAnchor: [0, 0], // Adjust popup anchor
        tooltipAnchor: [0, -5], // Adjust tooltip anchor
    });
}

// Function to generate a random color
function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}
