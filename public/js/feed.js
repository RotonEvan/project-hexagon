let localStorage = window.localStorage;
let sessionStorage = window.sessionStorage;

let selfname;
let selfEmail;
let uid;
let usr = firebase.auth().currentUser;
let signed = (usr) ? true : false;

let db = firebase.firestore();
let users = db.collection('users');
let posts = db.collection('posts');

document.addEventListener('DOMContentLoaded', async() => {
    const node = await Ipfs.create()
    window.node = node
    const status = node.isOnline() ? 'online' : 'offline'
    console.log(`Node status: ${status}`);
    // let validip4 = Multiaddr.multiaddr('/ip4/172.65.0.13/tcp/4009/p2p/QmcfgsJsMtx6qJb74akCw1M24X1zFwgGo11h1cuhwQjtJP');
    // const resp = await node.bootstrap.add(validip4);
    // await node.pin.remote.service.add('pinata', {
    //     endpoint: new URL('https://api.pinata.cloud'),
    //     key: '9a4f3063f791dde49fea'
    // })
    // console.log(resp);
    initApp();
    console.log(`Signed? - ${signed}`);
    console.log(`FireAuth? - ${firebase.auth().currentUser}`);
});

const util = nacl.util;

let publicKey;
let secretKey;

let peerKey;
let shared;

const newNonce = () => nacl.randomBytes(nacl.box.nonceLength);

const JsonToArray = function(json) {
    // var str = JSON.stringify(json, null, 0);
    // console.log(str);
    var ret = new Uint8Array(32);
    for (var i = 0; i < 32; i++) {
        ret[i] = json[i];
    }
    return ret
};

const stringToArray = function(str) {
    let strArray = str.split(',');
    return Uint8Array.from(strArray);
}

const encrypt = (secretOrSharedKey, json, key) => {
    const nonce = newNonce();
    const messageUint8 = util.decodeUTF8(JSON.stringify(json));
    const encrypted = key ?
        nacl.box(messageUint8, nonce, key, secretOrSharedKey) :
        nacl.box.after(messageUint8, nonce, secretOrSharedKey);

    const fullMessage = new Uint8Array(nonce.length + encrypted.length);
    fullMessage.set(nonce);
    fullMessage.set(encrypted, nonce.length);

    const base64FullMessage = util.encodeBase64(fullMessage);
    return base64FullMessage;
};

const decrypt = (secretOrSharedKey, messageWithNonce, key) => {
    const messageWithNonceAsUint8Array = util.decodeBase64(messageWithNonce);
    const nonce = messageWithNonceAsUint8Array.slice(0, nacl.box.nonceLength);
    const message = messageWithNonceAsUint8Array.slice(
        nacl.box.nonceLength,
        messageWithNonce.length
    );

    const decrypted = key ?
        nacl.box.open(message, nonce, key, secretOrSharedKey) :
        nacl.box.open.after(message, nonce, secretOrSharedKey);

    if (!decrypted) {
        throw new Error('Could not decrypt message');
    }

    const base64DecryptedMessage = util.encodeUTF8(decrypted);
    return JSON.parse(base64DecryptedMessage);
};

async function addTxt(data) {
    let result = await node.add(data);
    // console.log(result);
    return result.path;
}

async function catMsg(recvhash) {
    console.log('check');
    const stream = await node.cat(recvhash)
    let msg = ""

    for await (const chunk of stream) {
        // chunks of data are returned as a Buffer, convert it back to a string
        msg += chunk.toString()
    }

    console.log(msg);

    let postObj = JSON.parse(msg);
    return postObj;
}

function getPosts() {
    posts.where('timestamp', '<=', Date.now()).get().then(async(snap) => {
        snap.forEach(async doc => {
            console.log(doc.data().hash);
            // if (doc.data().hash.startsWith('bafy')) {
            //     retrieve(doc.data().hash);
            // } else {
            //     // getJSON(doc.data().hash)
            //     let postObj = await catMsg(doc.data().hash);
            //     insertPosts(postObj);
            // }
            let postObj = await catMsg(doc.data().hash);
            insertPosts(postObj);
        });
    })
}

async function sendPost() {
    let postText = document.getElementById('post').value;
    let p_id = uuidv4();
    let timestamp = Date.now();
    const obj = {
        name: selfname,
        email: selfEmail,
        content: postText,
        p_id: p_id,
        time: timestamp
    };
    // let data = JSON.stringify(obj);
    // let senthash = await addTxt(data);
    // pinByJSON(obj);
    // console.log(senthash);
    // let cid = CID.parse(senthash)
    // let pin = await ipfs.pin.remote.add(cid, {
    //     service: 'pinata',
    //     name: p_id
    // })
    // console.log(pin)
    let files = makeFileObjects(obj);
    let cid = await storeFiles(files);
    console.log(cid);
    insertPosts(obj);
    let hash = await retrieve(cid);

    let pRef = posts.doc(obj.p_id);
    pRef.set({
        id: obj.p_id,
        email: obj.email,
        name: obj.name,
        timestamp: obj.time,
        hash: hash
    });

}

function getAccessToken() {
    // If you're just testing, you can paste in a token
    // and uncomment the following line:
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDIxMjEwMTk0QzFlNzQ3ODgxRTNDZTE3RjUyRjE4MDc5QzU2MGMxYWMiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2NDA0NjYzMzc3NDEsIm5hbWUiOiJIZXhhZ29uIn0.UxqjXMQQ2Iu6xEaJJR_8oiPwlCFz23CJtVxlbtVWI5I'

    // In a real app, it's better to read an access token from an 
    // environement variable or other configuration that's kept outside of 
    // your code base. For this to work, you need to set the
    // WEB3STORAGE_TOKEN environment variable before you run your code.
    //   return process.env.WEB3STORAGE_TOKEN
}

let makeFileObjects = function(obj) {
    // You can create File objects from a Blob of binary data
    // see: https://developer.mozilla.org/en-US/docs/Web/API/Blob
    // Here we're just storing a JSON object, but you can store images,
    // audio, or whatever you want!
    // const obj = { hello: 'world' }
    const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' })

    const files = [
        new File([blob], 'post.json')
    ]
    return files
}

let storeFiles = async function(files) {
    // const client = makeStorageClient()
    // const client = new Web3Storage({ token: getAccessToken() });
    const cid = await client.put(files)
    console.log('stored files with cid:', cid)

    return cid
}

async function retrieve(cid) {
    // const client = makeStorageClient()
    const res = await client.get(cid)
    console.log(`Got a response! [${res.status}] ${res.statusText}`)
    if (!res.ok) {
        throw new Error(`failed to get ${cid}`)
    }

    const files = await res.files()
    for (const file of files) {
        console.log(`${file.cid} -- ${file.path} -- ${file.size}`)
        console.log(file);
        return file.cid;
    }
}

function linkify(text) {
    var urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(urlRegex, function(url) {
        return '<a href="' + url + '">' + url + '</a>';
    });
}

function insertPosts(obj) {
    const template = document.querySelector('template[data-template="post-temp"]');
    // const nameEl = template.content.querySelector('.message__name');
    // if (options.emoji || options.selfname) {
    //     nameEl.innerText = options.selfname + ' ' + options.emoji;
    // }
    let msgcontent_sanitized = linkify(obj.content);
    template.content.querySelector('.content').innerHTML = msgcontent_sanitized;
    template.content.querySelector('.timestamp').innerHTML = new Date(obj.time);
    template.content.querySelector('.name').innerHTML = obj.name;

    const clone = document.importNode(template.content, true);
    // const messageEl = clone.querySelector('.chat');
    // if (isFromMe) {
    //     messageEl.classList.add('outgoing');
    // } else {
    //     messageEl.classList.add('incoming');
    // }

    const postsEl = document.querySelector('.posts');
    postsEl.appendChild(clone);
}

function getJSON(hash) {
    $.ajax({
        url: 'https://gateway.pinata.cloud/ipfs/' + hash,
        success: function(data) {
            console.log(data);
            insertPosts(data)
                //process the JSON data etc
        }
    })
}


async function pinByJSON(obj) {

    const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
    // const body = {
    //     hashToPin: hashToPin,
    //     // hostNodes: [
    //     //     '/ip4/hostNode1ExternalIP/tcp/4001/ipfs/hostNode1PeerId',
    //     //     '/ip4/hostNode2ExternalIP/tcp/4001/ipfs/hostNode2PeerId'
    //     // ],
    //     pinataMetadata: {
    //         name: 'hexagon-posts',
    //         keyvalues: {
    //             customKey: 'hexagon'
    //         }
    //     }
    // };

    await axios.post(url, obj, {
        headers: {
            Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIyMmQzOTNkNy04NDY4LTQwYTctYjUyYi1mZTU4YTQxZDZiODkiLCJlbWFpbCI6ImRlYmFqeW90aWhAaWl0YmhpbGFpLmFjLmluIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siaWQiOiJGUkExIiwiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjF9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZX0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjlhNGYzMDYzZjc5MWRkZTQ5ZmVhIiwic2NvcGVkS2V5U2VjcmV0IjoiM2VlNTZmYmUwMjAwY2FiOTQ1ZDIxNTMyMWI0OTUzYWU1MTlmNGUzODA3MjBmZWRhMjI3YzViYzJhYjE5MjUxNyIsImlhdCI6MTY0MDQ1NDgzOH0._MDxwsXxr3EpHYxl5jJgHOhRxr9t9NArHfqAfKGgmvo"
        }
    }).then(function(response) {
        //handle response here
        console.log(response.data.IpfsHash);
        let pRef = posts.doc(obj.p_id);
        pRef.set({
            id: obj.p_id,
            email: obj.email,
            name: obj.name,
            timestamp: obj.time,
            hash: response.data.IpfsHash
        });
        insertPosts(obj);
    }).catch(function(error) {
        //handle error here
        console.log(error);
    });
}

/**
 * Function called when clicking the Login/Logout button.
 */
function toggleSignIn() {
    if (!firebase.auth().currentUser) {
        var provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/plus.login');
        firebase.auth().signInWithRedirect(provider);
    } else {
        firebase.auth().signOut();
        usr = null;
    }
    // document.getElementById('quickstart-sign-in').disabled = true;
}

/**
 * initApp handles setting up UI event listeners and registering Firebase auth listeners:
 *  - firebase.auth().onAuthStateChanged: This listener is called when the user is signed in or
 *    out, and that is where we update the UI.
 *  - firebase.auth().getRedirectResult(): This promise completes when the user gets back from
 *    the auth redirect flow. It is where you can get the OAuth access token from the IDP.
 */
function initApp() {
    // Result from Redirect auth flow.
    firebase.auth().getRedirectResult().then(function(result) {
        if (result.credential) {
            // This gives you a Google Access Token. You can use it to access the Google API.
            var token = result.credential.accessToken;
            // document.getElementById('quickstart-oauthtoken').textContent = token;
        } else {
            // document.getElementById('quickstart-oauthtoken').textContent = 'null';
        }
        // The signed-in user info.
        var user = result.user;
    }).catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        // The email of the user's account used.
        var email = error.email;
        // The firebase.auth.AuthCredential type that was used.
        var credential = error.credential;
        if (errorCode === 'auth/account-exists-with-different-credential') {
            alert('You have already signed up with a different auth provider for that email.');
            // If you are using multiple auth providers on your app you should handle linking
            // the user's accounts here.
        } else {
            console.error(error);
        }
    });

    // Listening for auth state changes.
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // User is signed in.
            signed = true;
            usr = user;
            selfname = user.displayName;
            selfEmail = user.email;
            // var emailVerified = user.emailVerified;
            // var photoURL = user.photoURL;
            // var isAnonymous = user.isAnonymous;
            uid = user.uid;

            if (localStorage.getItem(uid + '-priv-key')) {
                console.log('getting keys from local storage');
                secretKey = stringToArray(localStorage.getItem(uid + '-priv-key'));
                publicKey = stringToArray(localStorage.getItem(uid + '-pub-key'));
            } else {
                console.log('generating new keys and setting keys into local storage');
                const keypair = nacl.box.keyPair();
                publicKey = keypair.publicKey;
                secretKey = keypair.secretKey;
                localStorage.setItem(uid + '-priv-key', secretKey);
                localStorage.setItem(uid + '-pub-key', publicKey);
            }

            let uRef = users.doc(uid);
            uRef.get().then((doc) => {
                if (doc.exists) {
                    console.log('user doc exists');
                    console.log(doc.data());
                    let data = doc.data();
                    if (publicKey.toString() !== data.pubkey) {
                        console.log('updating public key in storage');
                        uRef.update({
                            pubkey: publicKey.toString()
                        })
                    }
                    getPosts();
                } else {
                    console.log('new user');
                    uRef.set({
                        id: uid,
                        email: selfEmail,
                        name: selfname,
                        pubkey: publicKey.toString()
                    })
                    getPosts();
                }
            });
            // var providerData = user.providerData;
            // document.getElementById('quickstart-sign-in-status').textContent = 'Signed in';
            // document.getElementById('quickstart-sign-in').textContent = 'Sign out';
            // document.getElementById('quickstart-account-details').textContent = JSON.stringify(user, null, '  ');
        } else {
            signed = false;
            // User is signed out.
            // document.getElementById('quickstart-sign-in-status').textContent = 'Signed out';
            // document.getElementById('quickstart-sign-in').textContent = 'Sign in with Google';
            usr = null;
            window.location.href = '.';
            // document.getElementById('quickstart-account-details').textContent = 'null';
            // document.getElementById('quickstart-oauthtoken').textContent = 'null';
        }
        // document.getElementById('quickstart-sign-in').disabled = false;
    });

    // document.getElementById('quickstart-sign-in').addEventListener('click', toggleSignIn, false);
}