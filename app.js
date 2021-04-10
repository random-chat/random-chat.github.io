firebase.initializeApp({
    apiKey: "AIzaSyCi35bN3_sQOdYmv9YmVt-l7hMvKArrN8U",
    authDomain: "random-chat-webrtc.firebaseapp.com",
    databaseURL: "https://random-chat-webrtc-default-rtdb.firebaseio.com",
    projectId: "random-chat-webrtc",
    storageBucket: "random-chat-webrtc.appspot.com",
    messagingSenderId: "609114211494",
    appId: "1:609114211494:web:9c0603bfbbe416580de067",
    measurementId: "G-B52MN3BKN5"
});
firebase.analytics();

const peerConnection = new RTCPeerConnection({
    iceServers: [
        {
            urls: [
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
                'stun:stun3.l.google.com:19302',
                'stun:stun4.l.google.com:19302',
                'stun:stun01.sipphone.com',
                'stun:stun.ekiga.net',
                'stun:stun.fwdnet.net',
                'stun:stun.ideasip.com',
                'stun:stun.iptel.org',
                'stun:stun.rixtelecom.se',
                'stun:stun.schlund.de',
                'stun:stunserver.org',
                'stun:stun.softjoys.com',
                'stun:stun.voiparound.com',
                'stun:stun.voipbuster.com',
                'stun:stun.voipstunt.com',
                'stun:stun.voxgratia.org',
                'stun:stun.xten.com'
            ],
        },
        {
            urls: 'turn:192.158.29.39:3478?transport=udp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
        },
        {
            urls: 'turn:192.158.29.39:3478?transport=tcp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
        }
    ],
    iceCandidatePoolSize: 10,
});
peerConnection.onicecandidate = event => {
    if (event.candidate) {
        peer.set({
            type: 'candidate',
            candidate: event.candidate.toJSON(),
            TIMESTAMP: firebase.database.ServerValue.TIMESTAMP
        })
    }
}
peerConnection.ondatachannel = event => {
    channel = event.channel;
    channel.onopen = event => onChannel();
}

let database = firebase.database();
let channel
let user
let peer

user = database.ref('users').push({ type: 'init' });
user.onDisconnect().remove();
//database.ref('users/'+ peerID).set({type:'Request_response', key:user.key, TIMESTAMP: firebase.database.ServerValue.TIMESTAMP})
user.on('value', snapshot => {
    var data = snapshot.val();
    console.log(data)
    switch (data.type) {
        case 'init':
            console.log('user key :', user.key);
            break;
        case 'Request_response':
            if (!peer) {
                peer = database.ref('users/' + data.key);
                peer.set({
                    type: 'Request_response',
                    key: user.key,
                    TIMESTAMP: firebase.database.ServerValue.TIMESTAMP
                });
            } else {
                channel = peerConnection.createDataChannel('channel');
                channel.onopen = event => onChannel();
                peerConnection.createOffer().then(offer => {
                    peerConnection.setLocalDescription(offer);
                    peer.set({
                        type: 'offer',
                        offer: {
                            sdp: offer.sdp,
                            type: offer.type
                        },
                        TIMESTAMP: firebase.database.ServerValue.TIMESTAMP
                    });
                });
            }
            break;
        case 'offer':
            peerConnection.setRemoteDescription(data.offer);
            peerConnection.createAnswer().then(answer => {
                peerConnection.setLocalDescription(answer);
                peer.set({
                    type: 'answer',
                    answer: {
                        sdp: answer.sdp,
                        type: answer.type
                    },
                    TIMESTAMP: firebase.database.ServerValue.TIMESTAMP
                });
            });
            break;
        case 'answer':
            peerConnection.setRemoteDescription(data.answer);
            break;
        case 'candidate':
            peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            break;
        default:
            console.error(data)
            break;
    }
});

function matching() {
    database.ref('queue/').get().then(snapshot => {
        if (snapshot.exists()) {
            let value = snapshot.val();
            let queue_keys = Object.keys(value);
            let randomkey = queue_keys[queue_keys.length * Math.random() << 0];
            let randomvalue = value[randomkey];
            database.ref('queue/' + randomkey).remove();
            database.ref('users/' + randomvalue).set({
                type: 'Request_response',
                key: user.key,
                TIMESTAMP: firebase.database.ServerValue.TIMESTAMP
            })
        } else {
            let queue = database.ref('queue/').push(user.key);
            queue.onDisconnect().remove();
        }
    });
}

function onChannel() {
    alert('connected!')
    init();
    channel.onmessage = event => resive(JSON.parse(event.data));
}

//--------------------

function init() {
    $(document).on('keydown', 'div.input-div textarea', function (e) {
        if (e.keyCode == 13 && !e.shiftKey) {
            e.preventDefault();
            const message = $(this).val();

            sendMessage(message);

            clearTextarea();
        }
    });
}

function createMessageTag(LR_className, senderName, message) {

    let chatLi = $('div.chat.format ul li').clone();

    chatLi.addClass(LR_className);
    chatLi.find('.sender span').text(senderName);
    chatLi.find('.message span').text(message);

    return chatLi;
}

function appendMessageTag(LR_className, senderName, message) {
    const chatLi = createMessageTag(LR_className, senderName, message);

    $('div.chat:not(.format) ul').append(chatLi);

    $('div.chat').scrollTop($('div.chat').prop('scrollHeight'));
}
function sendMessage(message) {
    const data = {
        "senderName": user.key,
        "message": message
    };

    channel.send(JSON.stringify(data))
    resive(data);
}

function clearTextarea() {
    $('div.input-div textarea').val('');
}

function resive(data) {
    const LR = (data.senderName != user.key) ? "left" : "right";
    appendMessageTag(LR, data.senderName, data.message);
}

matching()
