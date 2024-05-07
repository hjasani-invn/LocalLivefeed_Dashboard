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

async function updateMarkers() {
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
        for (const user of selected_users) {
            try {
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
                                }).addTo(map);
                                markers.addLayer(userMarker); // Add the marker to the layer group
                                valueCounter++; // Increment the counter for each value changed
                                // Increment the marker counter
                                markerCounter++;
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching or processing CSV:', error);
            }
        }
    } else {
        console.log("No floor or user selected.");
    }

    // Log the total number of values changed
    console.log(`Total values changed: ${valueCounter}`);

    // Log the total number of markers displayed
    console.log("Total markers displayed:", markerCounter);
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

    socket.on('update_values', function(data) {
        document.getElementById('latitude').innerText = data.latitude;
        document.getElementById('longitude').innerText = data.longitude;
        document.getElementById('floor-number').innerText = data.floorNumber;

        // Log coordinates to the console
        console.log("Coordinates (Real-time):", data);

        // Move marker to real-time coordinates
        marker.setLatLng([data.latitude, data.longitude]);
    });

    // After all CSV lines have been read, reset the UI and switch the button back to "Play"
    socket.on('csv_finished', function() {
        console.log('All CSV lines have been read');
        stopRealTimeUpdates(); // Stop real-time updates
        isPlaying = false; // Set isPlaying to false
        playButton.textContent = 'Play'; // Update button text to "Play"
    });
}





// Function to stop real-time updates
function stopRealTimeUpdates() {
    console.log("Stopping real-time updates");
    // Unsubscribe from socket updates
    socket.off('update_values');
    socket.off('csv_finished');
    isPlaying = false;



}

// Attach the handleCheckboxChange function to checkbox change events
var checkboxes = document.getElementsByClassName('user-checkbox');
for (var i = 0; i < checkboxes.length; i++) {
    checkboxes[i].addEventListener('change', handleCheckboxChange);
}

var playButton = document.getElementById('playButton');




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
}






// Function to stop playback
function stopPlayback() {
    isPlaying = false;
    playButton.textContent = 'Play';
    stopRealTimeUpdates();
}

// Add Socket.IO script for real-time updates
var socket = io.connect('http://' + document.domain + ':' + location.port);

socket.on('update_values', function (data) {
    console.log('Values data updated:', data);
    document.getElementById('latitude').innerText = data.latitude;
    document.getElementById('longitude').innerText = data.longitude;
    document.getElementById('floor-number').innerText = data.floorNumber;
});

// Update marker position
socket.on('update_map', function (data) {
    console.log('Map data updated:', data);
    // on initialization marker movement
    marker.setLatLng([data.map.latitude, data.map.longitude]);
});

// Update user information
socket.on('update_users_info', function (data) {
    console.log('Users info updated:', data);
    var userList = document.getElementById('user-list');
    userList.innerHTML = ''; // Clear existing user list

    // Update user information
    for (var user in data.users) {
        var listItem = document.createElement('li');
        listItem.innerHTML = `<strong>${user}:</strong> ${data.users[user]}`;
        userList.appendChild(listItem);
    }
});

socket.on('update_users_info_for_checklist', function (data) {
    console.log('Received totalFiles:', data.totalFiles);

    // Call createCheckboxes function with the totalFiles parameter
    createCheckboxes(data.totalFiles);
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