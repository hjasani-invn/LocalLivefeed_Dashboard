// URL to the KML file
var kmlUrl = 'static/kml/doc.kml';
var selected_users = []; // Declare selected_users at the beginning of your script

// Create Leaflet map
var map = null;
var kmlData = null;
var south, west, north, east, rotation; // Declare variables for bounds
var currentImageOverlay = null; // To keep track of the current image overlay
var floorSelect = document.getElementById('floor-select');
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

// Function to populate floor options in the dropdown
function populateFloorOptions(floorOptions) {
    floorOptions.forEach(floor => {
        var option = document.createElement('option');
        option.value = floor;
        option.textContent = floor;
        floorSelect.appendChild(option);
    });
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








function updateMarkers() {
    console.log("inside updateMarkers");
    var selectedFloor = floorSelect.value.toUpperCase().replace('F', ''); // Remove 'F' prefix
    console.log("Selected Floor:", selectedFloor);

    var selectedUsers = Array.from(document.getElementsByClassName('user-checkbox'))
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);
    console.log("Selected Users:", selectedUsers);

    // Check if any selected user matches the selected floor
    var selectedUser = selectedUsers.find(user => user === `data_${selectedFloor}`);
    if (selectedUser) {
        console.log("Selected user matches selected floor:", selectedUser);
        // Read the corresponding CSV file and update marker position
        fetch(`http://localhost:5000/static/data/${selectedUser}.csv`)
            .then(response => response.text())
            .then(csvData => {
                console.log("CSV data:", csvData);
                // Parse CSV data
                var lines = csvData.split('\n');
                var latitudeIndex = 7; // Assuming latitude is at column 7
                var longitudeIndex = 8; // Assuming longitude is at column 8
                var floorNumberIndex = 11; // Assuming floor number is at column 11

                // Process each row of the CSV data
                var delay = 150; // Delay in milliseconds between each marker update
                lines.forEach((line, index) => {
                    setTimeout(() => {
                        var rowData = line.split(',');
                        var floorNumber = parseInt(rowData[floorNumberIndex]); // Assuming floor number is an integer
                        if (floorNumber === parseInt(selectedFloor)) {
                            var latitude = parseFloat(rowData[latitudeIndex]);
                            var longitude = parseFloat(rowData[longitudeIndex]);
                            var floorNumber = parseInt(rowData[floorNumberIndex])
                            console.log("Latitude:", latitude, "Longitude:", longitude, "Floor Number:", floorNumber);
                            if (!isNaN(latitude) && !isNaN(longitude)) {
                                marker.setLatLng([latitude, longitude]);
                            }
                        }
                    }, index * delay);
                });
            })
            .catch(error => console.error('Error fetching or processing CSV:', error));
    } else {
        console.log("No user selected or selected user doesn't match the selected floor.");
    }
}










// Add an event listener for file checkbox change events
var fileCheckboxes = document.getElementsByClassName('file-checkbox');
for (var i = 0; i < fileCheckboxes.length; i++) {
    fileCheckboxes[i].addEventListener('change', handleFileCheckboxChange);
}

function handleCheckboxChange() {
    // Example: Selecting a file named 'data_1.csv'
    var selectedFileName = event.target.value;
    socket.emit('select_file', { file_name: selectedFileName });

    console.log('Checkbox state changed')
    selected_users = Array.from(document.getElementsByClassName('user-checkbox'))
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);
    console.log("Selected Users:", selected_users);

    // updateMarkers();
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
    // Implement the logic to stop real-time updates
    // (e.g., unsubscribe from socket updates or other data source)
}

// Attach the handleCheckboxChange function to checkbox change events
var checkboxes = document.getElementsByClassName('user-checkbox');
for (var i = 0; i < checkboxes.length; i++) {
    checkboxes[i].addEventListener('change', handleCheckboxChange);
}

var playButton = document.getElementById('playButton');

// Function to toggle playback
// Function to toggle playback
function togglePlayback() {
    isPlaying = !isPlaying;
    playButton.textContent = isPlaying ? 'Pause' : 'Play';

    if (isPlaying) {
        // Only start real-time updates if a floor and user are selected
        if (selected_floor !== null && selected_users.length > 0) {
            console.log("Starting real-time updates for floor:", selected_floor, "and users:", selected_users);
            startRealTimeUpdates();
            updateMarkers(); // Call updateMarkers when starting playback
        } else {
            // Provide a message or handle the case when no floor or user is selected
            console.log("Select a floor and user before playing.");
            isPlaying = false;
            playButton.textContent = 'Play';
        }
    } else {
        // Implement the logic to pause real-time updates
        // (e.g., unsubscribe from socket updates or other data source)
        console.log("Pausing real-time updates.");
        stopRealTimeUpdates();
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
    // marker.setLatLng([data.map.latitude, data.map.longitude]);
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

    // Add markers for each user
    for (var floor in data.markers) {
        for (var user_id in data.markers[floor])
        console.log("Selected User Data:", selectedUserData);

        {
            var user_marker = data.markers[floor][user_id];
            var user_floor_color = floorOptions.indexOf(floor) % 5; // Use the index as a color code
            L.marker([user_marker.latitude, user_marker.longitude], {
                icon: createMarkerIcon(user_floor_color)
            }).addTo(markers);
        }
    }
});

// Function to create custom marker icon
function createMarkerIcon(color) {
    return new L.Icon({
        iconUrl: `https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        tooltipAnchor: [16, -28],
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        shadowSize: [41, 41],
        shadowAnchor: [12, 41],
        className: 'user-marker'
    });
}
