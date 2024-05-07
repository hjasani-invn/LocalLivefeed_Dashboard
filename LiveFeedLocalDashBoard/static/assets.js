

document.addEventListener('DOMContentLoaded', function () {
    // Your JavaScript code here





// Function to enable search on Asset Id
function enableSearch() {
    var searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search...';
    searchInput.style.width = '100%';
    this.innerHTML = '';
    this.appendChild(searchInput);
    searchInput.focus(); // Focus on the input field
    searchInput.addEventListener('blur', function() {
        var value = this.value;
        var textNode = document.createTextNode(value);
        this.parentNode.removeChild(this);
        document.querySelector('.search-header').appendChild(textNode);
    });
}


populateFloorOptions(Object.keys(floors));


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
}

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




function createCheckboxesForAssetsonAssetPage(totalFiles) {
    var checkboxContainer = document.getElementById('checkbox-container-for-assetsPage');
    checkboxContainer.innerHTML = '';

    for (var i = 1; i <= totalFiles; i++) {
        var user = `data_${i}`;
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `checkbox_${user}`;
        checkbox.name = user;
        checkbox.className = 'assetsPage-checkbox'; // Corrected class name here
        checkbox.value = user;  // Set the user name as the value

        const textContent = document.createTextNode(user);

        label.appendChild(checkbox);
        label.appendChild(textContent);

        checkboxContainer.appendChild(label);
    }

    // Attach the handleCheckboxChange function to checkbox change events
    var checkboxes = document.getElementsByClassName('assetsPage-checkbox'); // Corrected class name here
    for (var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].addEventListener('change', handleCheckboxChange);
    }
}






var socket = io.connect('http://' + document.domain + ':' + location.port);


socket.on('number_of_files', function (data) {
    createCheckboxesForAssetsonAssetPage(data.totalFiles)
});


socket.on('update_users_info_for_checklist', function (data) {
    createCheckboxesForAssetsonAssetPage(data.totalFiles)
});

});





// Function to add last known position marker
function addLastKnownPositionMarker(data) {
    const timestamp = new Date(data.timestamp);
    const formattedTime = timestamp.toLocaleString(); // Format timestamp as string
    const lastKnownPositionDiv = document.getElementById('last-known-position');
    lastKnownPositionDiv.textContent = `Last Known Position: ${formattedTime}`;
}

// Event listener for last known position updates
socketio.on('last_known_position', function(data) {
    addLastKnownPositionMarker(data);
});



