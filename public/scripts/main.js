'use strict';

/* Set up */

// Checks that the Firebase SDK has been correctly setup and configured.
function checkSetup() {
    if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
      window.alert('You have not configured and imported the Firebase SDK. ');
    }
}

/* Authentication */

function initFirebaseAuth() {
    firebase.auth().onAuthStateChanged(authStateObserver);
}

function signUp(email, password, name) {
    console.log('sign up with: ' + email + ' ' + password + ' ' + name);
    firebase.auth().createUserWithEmailAndPassword(email, password).then(function(user) {
        return user.updateProfile({
            displayName: name
        })
    }).catch(function(error) {
        var errorMessage = error.message;
        displayAuthError(errorMessage);
    });
}

function signIn(email, password) {
    console.log('sign in with: ' + email + ' ' + password);
    firebase.auth().signInWithEmailAndPassword(email, password).then(function(user) {
        console.log(user);
    }).catch(function(error) {
        var errorMessage = error.message;
        displayAuthError(errorMessage);
    });
    
}

function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider);
}

function signOut() {
    firebase.auth().signOut();
}

function getUserID() {
    return firebase.auth().currentUser.uid;
}

function getUserName() {
    return firebase.auth().currentUser.displayName;
}

function getProfilePicUrl() {
    return firebase.auth().currentUser.photoURL || '/images/profile_placeholder.png';
}

/* Firestore */

function getEvents(filter = 'all') {

    removeAllEventCards();

    var eventList = firebase.firestore().collection('events')

    if(filter !== 'all') {
        eventList = firebase.firestore().collection('events').where('type','==', filter)
    }

    eventList.onSnapshot(function(snapshot) {
        const events = snapshot.docs.map ( doc => (
            {id: doc.id, ...doc.data()}
        ))
        console.log(events)
        events.forEach(event => {
            displayEventCard(event.id, event.name, event.startTime, event.description, event.imageUrl)
        })
    });
}

function subscribeEvent(eventId) {

    firebase.firestore().collection('events').doc(eventId).onSnapshot(function(doc) {

        const eventId = doc.id
        const event = doc.data()

        // check if user is already registered for the event
        const attendees = event.attendees
        console.log(attendees)
        const attendeesId = attendees.map (attendee => attendee.userId)
        const isRegistered = attendeesId.includes(getUserID())
        
        // then display data
        displayEventDetail(eventId, event.name, event.startTime, event.description, event.imageUrl, attendees, isRegistered)
    });

}

function getMyEvents() {

    const user = {
        userId: getUserID(),
        profilePicUrl: getProfilePicUrl()
    }
    
    console.log('load my event with: ' + user)
    firebase.firestore().collection('events').where('attendees', 'array-contains', user).onSnapshot(function(snapshot) {
        const events = snapshot.docs.map ( doc => (
            {id: doc.id, ...doc.data()}
        ))
        events.forEach(event => {
            displayMyEventItem(event.id, event.name, event.startTime, event.description, event.imageUrl)
        })
    });
}

function registerForEvent(eventId) {
    const eventRef = firebase.firestore().collection('events').doc(eventId)
    const user =  { profilePicUrl: getProfilePicUrl(), userId: getUserID() }
    eventRef.update({ 'attendees': firebase.firestore.FieldValue.arrayUnion(user)})
}

/* Cloud Messaging */

function requestNotificationsPermissions() {}

function saveMessagingDeviceToken() {}

/* UI */

// Sign In / Sign Up

function initializeAuthUI() {

    // Add actions to elements
    $('#sign-out').click(signOut);

    $('#swapToSignUp').click(function(){
        swapToSignUpMode();
    });

    $('#swapToSignIn').click(function(){
        swapToSignInMode();
    });

    $('#signin-form').submit(function(){
        console.log('sign in submmitted');
        const email = $('#signInInputEmail').val();
        const password = $('#signInInputPassword').val();
        signIn(email, password);
        event.preventDefault();

    });

    $('#signup-form').submit(function(){
        console.log('sign up submmitted');
        const email = $('#signUpInputEmail').val();
        const password = $('#signUpInputPassword').val();
        const name = $('#signUpInputName').val();
        signUp(email, password, name);
        event.preventDefault();
    });

    $('#signInWithGoogle').click(function(){
        hideAuthError();
        signInWithGoogle();
    });

    $('#signInInputEmail, #signInInputPassword, #signUpInputEmail, #signUpInputPassword, #signUpInputName').change(function() {
        hideAuthError();
    });
}

function swapToSignInMode() {
    $('#signin-form').show();
    $('#signup-form').hide();
    $('.modal-title').text('Sign In');
    $('#error-message').hide();
}

function swapToSignUpMode() {
    $('#signin-form').hide();
    $('#signup-form').show();
    $('.modal-title').text('Sign Up');
    $('#error-message').hide();
}

function displayAuthError(err) {
    var errorMessageDiv = $('#error-message');
    errorMessageDiv.text(err);
    errorMessageDiv.show();
}

function hideAuthError() {
    if ($('#error-message').is(':visible')) {
        $('#error-message').hide();
    }
}

function authStateObserver(user) {
    console.log('authStateObserver user: ' + user);
    // console.log(JSON.stringify(user))
    if (user) {
        getMyEvents()
        $('#sign-in').hide();
        $('#my-event').show();
        $('#sign-out').show();
    } else {
        $('#sign-in').show();
        $('#my-event').hide();
        $('#sign-out').hide();
    }
    $('#authModal').modal('hide');
}

// Events

// Template for events.
const EVENT_TEMPLATE =
'<div class="col-sm-4 mt-3">'+
    '<div class="card">'+
        '<img class="image card-img-top" src="">'+
        '<div class="card-body">'+
            '<h5><a href="#" class="name card-title" data-toggle="modal" data-target="#eventDetailModal">d</a></h5>'+
            '<h6 class="date card-subtitle mb-2 text-muted">s</h6>'+
            '<p class="description card-text">s</p>'+
        '</div>'+
    '</div>'+
'</div>';

function displayEventCard(id, name, timestamp, description, imageUrl) {

    // use existing or create an event card element
    var div = $('div[data-item-id='+id+']');
    if (div.length === 0) {
        div = createEventCard(id, name, timestamp, description, imageUrl);
    } 

    // set up data
    div.find('.image').attr('src',  imageUrl ? imageUrl : '/images/temp.png');
    div.find('.name').text(name);
    div.find('.date').text(convertedDate(timestamp));
    div.find('.description').text(description);
}

function createEventCard(id) {

    // add event id to div element
    const div = $(EVENT_TEMPLATE);
    div.attr('data-item-id', id);

    // Add action to card title
    const cardTitleLabel = div.find('.card-title');
    cardTitleLabel.attr('data-id', id);
    cardTitleLabel.click(function() {
        const eventId = $(this).data().id;
        console.log("See detail for:" + eventId);
        subscribeEvent(eventId)
    });

    // append event to the event list
    $('#events').append(div);
    return div;
}

function removeAllEventCards() {
    // remove all attendee from the list (if any)
    $('div#events').children().each(function(i) {
        this.remove()
    })
}

// const EVENT_DETAIL_TEMPLATE = 
// '<img class="image img-fluid w-100 mb-3" src="images/temp.png">'+
// '<h6 class="date mb-2 text-muted">xxx</h6>'+
// '<p class="description">xxx</p>'+
// '<h6 class="attendee-title mb-2">Attendees (9)</h6>'+
// '<div class="attendee-list">'+
//    '<img src="images/temp.png" class="img-thumbnail rounded float-left">'+
// '</div>';

function displayEventDetail(id, name, timestamp, description, imageUrl, attendees, isRegistered) {

    $('#eventDetailModal .name').text(name);
    $('#eventDetailModal .image').attr('src',  imageUrl ? imageUrl : '/images/temp.png');
    $('#eventDetailModal .date').text(convertedDate(timestamp));
    $('#eventDetailModal .description').text(description);

    displayAttendees(attendees)

    // set up register button
    $('#eventDetailModal .register-button').attr('data-id', id);
    $('#eventDetailModal .register-button').click(function() {
        const eventId = $(this).data().id;
        console.log('register for: ' + eventId);
        // TODO: Check if logged in
        // TODO: Firestore call - to write attendee data
        // TODO: refresh view to show attendee updates
        // displayAttendees(attendees);
        // $('#eventDetailModal .modal-footer').hide();
    })

    handleRegisterButton(isRegistered)
}

function handleRegisterButton(isRegistered) {
    if (isRegistered) {
        // hide register button (if already registered)
        $('#eventDetailModal .modal-footer').hide();
    } else {
        // add action for register button
        $('#eventDetailModal .modal-footer').show();   
    }
}

const ATTENDEE_TEMPLATE = '<img src="" class="img-thumbnail rounded float-left">'

function displayAttendees(attendees) {

    // attendees
    $('#eventDetailModal .attendee-title').text('Attendees (' + attendees.length + ')');

    // remove all attendee from the list (if any)
    $('#eventDetailModal .attendee-list').children().each(function(i) {
        this.remove();
    })

    // display attendee profile pic (if needed)
    if (attendees.length > 0) {
        attendees.forEach(attendee => {
            displayAttendeeProfilePic(attendee.profilePicUrl)
        });
    }
}

function displayAttendeeProfilePic(imageUrl) {

    const img = $(ATTENDEE_TEMPLATE);
    img.attr('src', imageUrl);
    $('.modal-body .attendee-list').append(img)
}

// Template for my events.
const MY_EVENT_TEMPLATE =
'<div class="media mb-3">'+
    '<img src="/images/temp.png" class="image mr-3" style="width: 180px">'+
    '<div class="media-body">'+
        '<h5 class="name card-title"></h5>'+
        '<h6 class="date mb-2 text-muted"></h6>'+
        '<p class="description"></p>'+
    '</div>'+
'</div>';

function displayMyEventItem(id, name, timestamp, description, imageUrl) {
    // use existing or create an event card element
    var div = $('div[data-item-id='+id+']');
    if (div.length === 0) {
        div = createMyEventItem(id);
    } 

    // set up data
    div.find('.image').attr('src', imageUrl ? imageUrl : '/images/temp.png');
    div.find('.name').text(name);
    div.find('.date').text(convertedDate(timestamp));
    div.find('.description').text(description);
}

function createMyEventItem(id) {

    // add event id to div element
    const div = $(MY_EVENT_TEMPLATE);
    div.attr('data-item-id', id);

    // append event to the event list
    $('#my-events').append(div);
    return div;
}

function convertedDate(timestamp) {
    let date = timestamp.toDate()
    return moment(date).format('DD/MM/YYYY・hh:mm a')
}

// Dropdown

function addActionsForDropdownMenu() {

    // add actions for dropdowm
    $('#typeDropdownMenu').change(function() {
        handleForDropdownChanged();
    });

    $('#timeDropdownMenu').change(function() {
        handleForDropdownChanged();
    });
}

function handleForDropdownChanged() {
    const type = $('#typeDropdownMenu').val();
    const time = $('#timeDropdownMenu').val();
    getEvents(type);
}

function loadIncludes(callback) {
    var deferreds = [];
    // Create a deferred for all includes
    $("[data-load]").each(function() {
        const d = new $.Deferred();
        deferreds.push(d);
        $(this).load($(this).data("load"), function() {
            d.resolve();
        });
    });
    // Callback when all deferreds are done
    $.when.apply(null, deferreds).done(callback);
}

function writeNewEvent(EventTitle, EventDescription, EventDate, EventType, EventCoverImageUrl, UserKey) {
    return firebase.firestore().collection('Event').add(
        {   
            EventTitle: EventTitle,
            EventDescription: EventDescription,
            EventDate: EventDate,
            EventType: EventType,
            EventCoverImageUrl: EventCoverImageUrl,
            EventCreateTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            EventAttendeeList: firebase.firestore.FieldValue.arrayUnion(UserKey)
        })
}

/* Main */

$(document).ready(function() {
    loadIncludes(function() {
        // initialize Firebase
        initializeAuthUI();
        initFirebaseAuth();
        writeNewEvent('Test Title2','Test Des2', new Date(), 'all2', 'https://images.unsplash.com/photo-1566095082419-77dc02ebfe3d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=3451&q=80','User2').then( res => console.log(res))
    })
});

addActionsForDropdownMenu();

// isUserSignIn()

// getUID()

// TODO: checkSetup();

getEvents();

// loadMyEvents();