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
        // marker = L.marker([51.0652269994906, -114.1446146646332]).addTo(map);
        marker = L.marker([51.0652269994906, -114.1446146646332]);

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







// Variable to count the number of markers displayed
var markerCounter = 0;



async function updateMarkers() {
    try {
        console.log("Inside updateMarkers");

        // Check if real-time updates are still enabled
        if (!isPlaying) {
            console.log("Playback is paused. Stopping marker updates.");
            markers.clearLayers(); // Clear existing markers from the map
            return; // Return early if playback is paused
        }

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
    // marker.setLatLng([data.latitude, data.longitude]);
}




let positionMarkers = L.layerGroup();
let LiveFeedPaused = false; // Flag to control pause/resume state

async function startLiveFeed() {
    try {
        console.log('Starting LiveFeed');

        liveFeedIndex = 0;


        // Get the selected floor value and map it properly
        let selectedFloor = floorSelect.value.trim().toUpperCase(); // Convert to uppercase and remove leading/trailing whitespace
        if (selectedFloor.startsWith('F')) {
            selectedFloor = selectedFloor.substring(1); // Remove 'F' prefix
            if (selectedFloor === '1') {
                selectedFloor = '0'; // Treat 'F1' as 0
            }
        } else if (selectedFloor.startsWith('P')) {
            selectedFloor = '-' + (parseInt(selectedFloor.substring(1)) || ''); // Convert 'P1' to '-1', 'P2' to '-2', etc.
        }

        // Clear previous position markers before fetching and adding new ones
        positionMarkers.clearLayers();
        console.log("Previous position markers cleared.");


        // Get the selected users from checkboxes
        const checkboxes = document.querySelectorAll('#user-checkboxes input[type="checkbox"]:checked');
        const selectedUsers = Array.from(checkboxes).map(checkbox => checkbox.value);

        if (selectedUsers.length === 0) {
            console.log("No users selected for LiveFeed.");
            return;
        }

        // Object to store user counts
        const userCounts = {};

        // Function to fetch and process live feed data for a user
        async function fetchAndProcessData(user, rows) {
            const color = getRandomColor();
            let count = 0; // Counter for matching rows

            // Process each row of the CSV data
            const processRow = async (rowIndex) => {
                if (rowIndex >= rows.length) {
                    console.log("LiveFeed completed for", user);
                    userCounts[user] = count;
                    updateUsersList(selectedUsers, userCounts); // Update user list with counts
                    return;
                }
                const row = rows[rowIndex];
                const columns = row.split(',');
                const floorNumber = parseInt(columns[11]); // Assuming floor number is at column 11

                // Check if the row's floor number matches the selected floor
                if (!isNaN(floorNumber) && floorNumber.toString() === selectedFloor) {
                    const latitude = parseFloat(columns[7]);
                    const longitude = parseFloat(columns[8]);

                    if (!isNaN(latitude) && !isNaN(longitude)) {
                        count++; // Increment count for matching row

                        // Display position information
                        document.getElementById('latitude').textContent = latitude.toFixed(6);
                        document.getElementById('longitude').textContent = longitude.toFixed(6);
                        document.getElementById('floor-number').textContent = floorNumber;

                        const tooltipContent = `${user} - Floor: ${floorNumber}, Latitude: ${latitude}, Longitude: ${longitude}`;
                        // Create a marker for the position
                        const marker = L.marker([latitude, longitude], {
                            icon: createMarkerIcon(color)
                        }).bindTooltip(tooltipContent);

                        // Add the marker to the positionMarkers layer group
                        positionMarkers.addLayer(marker);

                        // Update user count with each new marker
                        userCounts[user] = count;
                        updateUsersList(selectedUsers, userCounts);

                        // Add the positionMarkers layer group to the map
                        map.addLayer(positionMarkers);

                        console.log("Position marker added for LiveFeed:", latitude, longitude);
                    } else {
                        console.log("Invalid latitude or longitude:", latitude, longitude);
                    }
                } else {
                    console.log("Row skipped because floor number does not match:", row);
                }
                setTimeout(() => processRow(rowIndex + 1), 500); // Wait for 1 second before processing next row
            };

            // Start processing rows
            await processRow(0);
        }

        // Start fetching and processing data for each selected user
        for (const user of selectedUsers) {
            const response = await fetch(`http://localhost:5000/static/data/${user}.csv`);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${user}.csv`);
            }
            const csvData = await response.text();
            const rows = csvData.split('\n');



            await fetchAndProcessData(user, rows);
        }

        console.log("LiveFeed started.");
    } catch (error) {
        console.error('Error loading LiveFeed data:', error);
    }
}


// Update user list with counts
function updateUsersList(selectedUsers, userCounts) {
    const userList = document.getElementById('user-list');
    userList.innerHTML = ''; // Clear existing content

    selectedUsers.forEach(user => {
        const listItem = document.createElement('li');
        const count = userCounts[user] || 0; // Get count or default to 0
        listItem.textContent = `${user}: ${count}`;
        userList.appendChild(listItem);
    });
}




function stopLiveFeed() {
    console.log('Stopping LiveFeed');
    isPlaying = false; // Set isPlaying to false when stopping liveFeed

    // Update the text content of the button to indicate the liveFeed is paused
    // liveFeedButton.textContent = 'LiveFeed';

    // Close the Socket.IO connection to stop receiving real-time updates
    if (socket) {
        socket.close();
        socket.removeAllListeners(); // This will remove all event listeners from the socket
        console.log('Socket listeners removed'); // Add a log statement to indicate that socket listeners are removed
    }
    console.log('LiveFeed stopped'); // Add a log statement to indicate that the live feed has stopped
}




// Variable to hold the interval ID for live feed
let liveFeedIntervalId = null;

// Flag to indicate if live feed is paused
let isLiveFeedPaused = false;

// Function to pause or resume the live feed
function pauseResumeLiveFeed() {
    LiveFeedPaused =!LiveFeedPaused;
    console.log(LiveFeedPaused ? "Real Live feed paused." : "Real Live feed resumed.");
}





function clear_liveFeed() {
    console.log("Clearing LiveFeed trajectory markers...");

    // Clear the position markers from the map
    positionMarkers.clearLayers();

    // Reset the position information on the UI
    document.getElementById('latitude').textContent = '';
    document.getElementById('longitude').textContent = '';
    document.getElementById('floor-number').textContent = '';


    document.getElementById('user-list').innerHTML = ''; // Clear existing content



    // Uncheck all checked checkboxes
    const checkboxes = document.querySelectorAll('#user-checkboxes input[type="checkbox"]:checked');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    console.log("Checkboxes unchecked.");

    console.log("LiveFeed trajectory markers cleared.");
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




// NEW APPROACH FOR ASSETS STARTS


function createCheckboxesForLiveFeedPlayback(totalFiles) {
    var checkboxContainer = document.getElementById('checkboxes_LiveFeedPlayBackSection');
    checkboxContainer.innerHTML = '';

    for (var i = 1; i <= totalFiles; i++) {
        var user = `data_${i}`;
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `checkbox_${user}`;
        checkbox.name = user;
        checkbox.className = 'checkbox-LiveFeedPlayBack'; // Updated class name here
        checkbox.value = user;  // Set the user name as the value

        const textContent = document.createTextNode(user);

        label.appendChild(checkbox);
        label.appendChild(textContent);

        checkboxContainer.appendChild(label);
    }

    // Attach the handleCheckboxChange function to checkbox change events
    var checkboxes = document.getElementsByClassName('checkbox-LiveFeedPlayBack'); // Updated class name here
    for (var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].addEventListener('change', handleCheckboxChange);
    }
}

function updateSelectedFloor(selectedFloor) {
    if (!isNaN(selectedFloor) && selected_users.length > 0) {
        // Trigger playback if users are selected and the selected floor is valid
        startPlayback();
    } else {
        console.log("No users selected for playback or invalid floor selected.");
        // Stop playback and clear markers if no users are selected or the floor is invalid
        playbackActive = false;
        markers.clearLayers();
    }
}

let playbackActive = false;
let playbackPaused = false;
let playbackIndex = 0;


async function startPlayback() {
    try {
        if (playbackActive) {
            console.log("Playback is already active.");
            return;
        }

        // Get the selected floor value and map it properly
        let selectedFloor = floorSelect.value.trim().toUpperCase(); // Convert to uppercase and remove leading/trailing whitespace
        if (selectedFloor.startsWith('F')) {
            selectedFloor = selectedFloor.substring(1); // Remove 'F' prefix
            if (selectedFloor === '1') {
                selectedFloor = '0'; // Treat 'F1' as 0
            }
        } else if (selectedFloor.startsWith('P')) {
            selectedFloor = '-' + (parseInt(selectedFloor.substring(1)) || ''); // Convert 'P1' to '-1', 'P2' to '-2', etc.
        }

        // Clear previous markers before fetching and adding new ones
        playbackMarkers.clearLayers();
        console.log("Previous markers cleared.");

        // Reset the playback index when starting a new playback
        playbackIndex = 0;

        const checkboxes = document.querySelectorAll('#checkboxes_LiveFeedPlayBackSection input[type="checkbox"]:checked');
        const selectedUsers = Array.from(checkboxes).map(checkbox => checkbox.value);

        if (selectedUsers.length === 0) {
            console.log("No users selected for playback.");
            return;
        }

        // Iterate over each checked checkbox
        for (const user of selectedUsers) {
            const color = getRandomColor();

            // Fetch CSV data for the selected user
            const response = await fetch(`http://localhost:5000/static/data/${user}.csv`);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${user}.csv`);
            }
            const csvData = await response.text();
            const rows = csvData.split('\n');

            // Process CSV data
            for (let i = playbackIndex; i < rows.length; i++) {
                const row = rows[i];
                const columns = row.split(',');
                const floorNumber = parseInt(columns[11]); // Assuming floor number is at column 11

                // Check if the row's floor number matches the selected floor
                if (!isNaN(floorNumber) && floorNumber.toString() === selectedFloor) {
                    const latitude = parseFloat(columns[7]);
                    const longitude = parseFloat(columns[8]);

                    if (!isNaN(latitude) && !isNaN(longitude)) {
                        // Create a marker for the position
                        const marker = L.marker([latitude, longitude], {
                            icon: createMarkerIcon(color)
                        }).bindTooltip(`${user} (Position)`);

                        // Add the marker to the playbackMarkers layer group
                        playbackMarkers.addLayer(marker);
                    }
                }
            }
        }

        // Display the markers on the map
        map.addLayer(playbackMarkers);
        console.log("All position markers added for playback.");
    } catch (error) {
        console.error('Error loading playback data:', error);
    }
}




function pauseResumePlayback() {
    playbackPaused = !playbackPaused; // Toggle the playbackPaused state
    console.log(playbackPaused ? "Playback paused." : "Playback resumed.");
}

// Function to stop playback
function stopPlayback() {
    playbackActive = false;
    markers.clearLayers(); // Clear markers when stopping playback
    console.log("Playback stopped and markers cleared.");
}

// Utility function to delay execution
function PlayBackDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}



// Define a layer group for playback markers
const playbackMarkers = L.layerGroup();

async function clearPlayback() {
    console.log("Clearing playback...");

    // Stop playback processing
    playbackActive = false;

    // Remove all playback markers from the map
    playbackMarkers.clearLayers();

    // Reset the pause/stop button
    playbackPaused = false;

    // Reset the playbackIndex
    playbackIndex = 0;

    // Uncheck all checked checkboxes
    const checkboxes = document.querySelectorAll('#checkboxes_LiveFeedPlayBackSection input[type="checkbox"]:checked');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });

    // Clear selected floor
    selected_floor = null;

    console.log("Playback cleared.");
}





// NEW APPROACH FOR ASSETS ENDS









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




function createDropdownForLiveFeedAsset(totalFiles) {
    var dropdownContainer = document.getElementById('dropdown_LiveFeedAssetSection');
    dropdownContainer.innerHTML = '';

    var select = document.createElement("select");
    select.id = "asset-select"; // Set an ID for the select element

    for (var i = 1; i <= totalFiles; i++) {
        var user = `data_${i}`;
        var option = document.createElement("option");
        option.value = user; // Set the value attribute of the option
        option.text = user; // Set the visible text of the option
        select.appendChild(option); // Append the option to the select element
    }

    dropdownContainer.appendChild(select); // Append the select element to the dropdown container
}



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

    // Retrieve the selected asset from the dropdown
    const assetSelect = document.getElementById('asset-select');
    const selectedAsset = assetSelect.value;

    // Check if any asset is selected
    if (!selectedAsset) {
        console.log("No asset selected.");
        return;
    }

    // Clear previous markers before fetching and adding new ones
    assetMarkers.clearLayers();
    console.log("Previous markers cleared.");

    // Reset the currentIndex when starting a new live feed
    currentIndex = 0;

    // Fetch and process data for the selected asset
    const color = getRandomColor();
    try {
        const response = await fetch(`http://localhost:5000/static/data/${selectedAsset}.csv`);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${selectedAsset}.csv`);
        }
        const csvData = await response.text();
        const rows = csvData.split('\n');

        // Process CSV data
        await processCSVData(rows, selectedAsset, color);
    } catch (error) {
        console.error(`Error loading asset data for ${selectedAsset}.csv:`, error);
    }

    // Display the markers on the map after processing the asset data
    map.addLayer(assetMarkers);
    console.log("All position markers added to the map.");
}




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

/*
let assetImageMarker = null;
let lastLocationData = {}; // Object to store last location data for each dropdown value

async function FindAsset() {
    if (assetImageMarker) {
        map.removeLayer(assetImageMarker);
    }

    const currentPosition = getCurrentPosition();

    if (currentPosition) {
        const assetImageIcon = L.icon({
            iconUrl: 'http://localhost:5000/static/img/asset_img.png',
            iconSize: [10, 10],
            iconAnchor: [5, 5],
        });

        assetImageMarker = L.marker(currentPosition, {
            icon: assetImageIcon,
        }).addTo(map);

        const selectedValue = document.getElementById('asset-select').value;
        const lastScanTime = new Date();
        const formattedTime = `${lastScanTime.getFullYear()}-${(lastScanTime.getMonth() + 1).toString().padStart(2, '0')}-${lastScanTime.getDate().toString().padStart(2, '0')} ${lastScanTime.getHours().toString().padStart(2, '0')}:${lastScanTime.getMinutes().toString().padStart(2, '0')}:${lastScanTime.getSeconds().toString().padStart(2, '0')}`;


        // Save last location data for the selected value
        lastLocationData[selectedValue] = {
            user: selectedValue,
            lastScanTime: formattedTime,
            latitude: currentPosition.lat,
            longitude: currentPosition.lng
        };

        // Transmit the saved data to the Asset page
        transmitDataToAssetPage(lastLocationData[selectedValue]);

        localStorage.setItem('lastLiveFeedAssetScanTime', JSON.stringify(lastLocationData[selectedValue]));


        // Display last scan time on the current page
        const lastScanTimesString = `${selectedValue}: ${formattedTime}: ${currentPosition.lat}: ${currentPosition.lng}`;
        const lastLiveFeedAssetScanTimeContainer = document.getElementById('lastLiveFeedAssetScanTimeContainer');
        if (lastLiveFeedAssetScanTimeContainer) {
            lastLiveFeedAssetScanTimeContainer.innerHTML = '';
            const div = document.createElement('div');
            div.textContent = lastScanTimesString;
            lastLiveFeedAssetScanTimeContainer.appendChild(div);
        } else {
            console.error("Error: Could not find lastLiveFeedAssetScanTimeContainer element in HTML.");
        }

        console.log("Asset image marker added at current position:", currentPosition);
    } else {
        console.log("No position available to mark as asset.");
    }
}

function transmitDataToAssetPage(data) {
    // Transmit data to the Asset page, you can use any appropriate method like AJAX, WebSocket, etc.
    console.log("Transmitting data to the Asset page:", data);
}




// Utility function to get the current position from the live feed
function getCurrentPosition() {
    const lastMarker = assetMarkers.getLayers()[assetMarkers.getLayers().length - 1];
    if (lastMarker) {
        return lastMarker.getLatLng();
    } else {
        return null;
    }
}


*/

///// assets ends


let assetImageMarker = null;
let lastLocationData = {}; // Object to store last location data for each dropdown value


async function FindAsset() {
    const currentPosition = getCurrentPosition();

    if (currentPosition) {
        const assetImageIcon = L.icon({
            iconUrl: 'http://localhost:5000/static/img/asset_img.png',
            iconSize: [10, 10],
            iconAnchor: [5, 5],
        });

        if (assetImageMarker) {
            map.removeLayer(assetImageMarker);
        }

        assetImageMarker = L.marker(currentPosition, {
            icon: assetImageIcon,
        }).addTo(map);

        const selectedValue = document.getElementById('asset-select').value;
        const lastScanTime = new Date();
        const formattedTime = `${lastScanTime.getFullYear()}-${(lastScanTime.getMonth() + 1).toString().padStart(2, '0')}-${lastScanTime.getDate().toString().padStart(2, '0')} ${lastScanTime.getHours().toString().padStart(2, '0')}:${lastScanTime.getMinutes().toString().padStart(2, '0')}:${lastScanTime.getSeconds().toString().padStart(2, '0')}`;

        // Initialize array for the selected asset if not already present
        if (!lastLocationData[selectedValue]) {
            lastLocationData[selectedValue] = [];
        }

        // Save new position data to the array for the selected asset
        lastLocationData[selectedValue].push({
            user: selectedValue,
            lastScanTime: formattedTime,
            latitude: currentPosition.lat,
            longitude: currentPosition.lng
        });

        // Save the data to localStorage
        localStorage.setItem('lastLiveFeedAssetScanTime', JSON.stringify(lastLocationData));

        // Display last scan time on the current page
        const lastScanTimesString = `${selectedValue}: ${formattedTime}: ${currentPosition.lat}: ${currentPosition.lng}`;
        const lastLiveFeedAssetScanTimeContainer = document.getElementById('lastLiveFeedAssetScanTimeContainer');
        if (lastLiveFeedAssetScanTimeContainer) {
            lastLiveFeedAssetScanTimeContainer.innerHTML = '';
            const div = document.createElement('div');
            div.textContent = lastScanTimesString;
            lastLiveFeedAssetScanTimeContainer.appendChild(div);
        } else {
            console.error("Error: Could not find lastLiveFeedAssetScanTimeContainer element in HTML.");
        }

        console.log("Asset image marker added at current position:", currentPosition);
    } else {
        console.log("No position available to mark as asset.");
    }
}




function getCurrentPosition() {
    const lastMarker = assetMarkers.getLayers()[assetMarkers.getLayers().length - 1];
    if (lastMarker) {
        return lastMarker.getLatLng();
    } else {
        return null;
    }
}







async function restartLiveFeedAsset() {
    // Start live feed asset again after a delay
    await delay(1000); // Adjust the delay time if needed
    await StartLiveFeedAsset(); // Wait for StartLiveFeedAsset to finish
}


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
//
// });

// // Update marker position
// socket.on('update_map', function (data) {
//     console.log('Map data updated:', data);
//     // on initialization marker movement
//     // marker.setLatLng([data.map.latitude, data.map.longitude]);
// });



// Update user information
socket.on('update_users_info', function (data) {
    // console.log('Users info updated:', data);
    var userList = document.getElementById('user-list');
    userList.innerHTML = ''; // Clear existing user list


    // this code displays data asap dashboards executes
    // // Update user information
    for (var user in data.users) {
        var listItem = document.createElement('li');
        listItem.innerHTML = `<strong>${user}:</strong> ${data.users[user]}`;
        userList.appendChild(listItem);
    }
});


socket.on('number_of_files', function (data) {
    createCheckboxes(data.totalFiles);
    // createCheckboxesForAssets(data.totalFiles)
    // createCheckboxesForLiveFeedAsset(data.totalFiles)
    createCheckboxesForLiveFeedPlayback(data.totalFiles)
    createDropdownForLiveFeedAsset(data.totalFiles)
});


socket.on('update_users_info_for_checklist', function (data) {
    // console.log('Received totalFiles:', data.totalFiles);

    // Call createCheckboxes function with the totalFiles parameter
    createCheckboxes(data.totalFiles);
    // createCheckboxesForAssets(data.totalFiles)
    // createCheckboxesForLiveFeedAsset(data.totalFiles)
    createCheckboxesForLiveFeedPlayback(data.totalFiles)
    createDropdownForLiveFeedAsset(data.totalFiles)

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
