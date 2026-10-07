    var DEFAULT_LANGUAGE = 'en',
        DEFAULT_TRIGGER_KEY = 'none',

        LANGUAGE,
        TRIGGER_KEY;

    function showMeaning (event){
        var createdDiv,
            info = getSelectionInfo(event);

        if (!info) { return; }

        retrieveMeaning(info)
            .then((response) => {
                if (!response || !response.content) { return noMeaningFound(createdDiv); }

                appendToDiv(createdDiv, response.content);
            });

        // Creating this div while we are fetching meaning to make extension more fast.
        createdDiv = createDiv(info);
    }


    function getSelectionInfo(event) {
        var word;
        var boundingRect;

        if (window.getSelection().toString().trim().length > 0) {
            word = window.getSelection().toString().trim();
            boundingRect = getSelectionCoords(window.getSelection());
        } else {
            return null;
        }

        var top = boundingRect.top + window.scrollY,
            bottom = boundingRect.bottom + window.scrollY,
            left = boundingRect.left + window.scrollX;

        if (boundingRect.height == 0) {
            top = event.pageY;
            bottom = event.pageY;
            left = event.pageX;
        }

        return {
            top: top,
            bottom: bottom,
            left: left,
            word: word,
            clientY: event.clientY,
            height: boundingRect.height
        };
    }

    function retrieveMeaning(info){
        return browser.runtime.sendMessage({ word: info.word, lang: LANGUAGE, time: Date.now() });
    }

    function createDiv(info) {
        var hostDiv = document.createElement("div");

        hostDiv.className = "dictionaryDiv";
        hostDiv.style.left = info.left -10 + "px";
        hostDiv.style.position = "absolute";
        hostDiv.style.zIndex = "1000000"
        hostDiv.attachShadow({mode: 'open'});

        var shadow = hostDiv.shadowRoot;
        var style = document.createElement("style");
        //style.textContent = "*{ all: initial}";
        style.textContent = ".mwe-popups{background:#fff;position:absolute;z-index:110;-webkit-box-shadow:0 30px 90px -20px rgba(0,0,0,0.3),0 0 1px #a2a9b1;box-shadow:0 30px 90px -20px rgba(0,0,0,0.3),0 0 1px #a2a9b1;padding:0;font-size:14px;min-width:300px;border-radius:2px}.mwe-popups.mwe-popups-is-not-tall{width:320px}.mwe-popups .mwe-popups-container{color:#222;margin-top:-9px;padding-top:9px;text-decoration:none}.mwe-popups.mwe-popups-is-not-tall .mwe-popups-extract{min-height:40px;max-height:140px;overflow:hidden;margin-bottom:47px;padding-bottom:0}.mwe-popups .mwe-popups-extract{margin:16px;display:block;color:#222;text-decoration:none;position:relative} .mwe-popups.flipped_y:before{content:'';position:absolute;border:8px solid transparent;border-bottom:0;border-top: 8px solid #a2a9b1;bottom:-8px;left:10px}.mwe-popups.flipped_y:after{content:'';position:absolute;border:11px solid transparent;border-bottom:0;border-top:11px solid #fff;bottom:-7px;left:7px} .mwe-popups.mwe-popups-no-image-tri:before{content:'';position:absolute;border:8px solid transparent;border-top:0;border-bottom: 8px solid #a2a9b1;top:-8px;left:10px}.mwe-popups.mwe-popups-no-image-tri:after{content:'';position:absolute;border:11px solid transparent;border-top:0;border-bottom:11px solid #fff;top:-7px;left:7px}" + `
            .wrap { text-shadow: transparent 0px 0px 0px, rgba(0,0,0,1) 0px 0px 0px !important; }

            /* Grow out of the arrow. Opened above the word, the popup hangs upward from its bottom edge,
               so it can grow when the definition arrives without being re-measured and moved. */
            .mwe-popups { transform-origin: 18px top; transition: opacity 150ms cubic-bezier(0.23, 1, 0.32, 1), transform 150ms cubic-bezier(0.23, 1, 0.32, 1); }
            .mwe-popups.flipped_y { transform-origin: 18px bottom; transform: translateY(-100%); }
            @starting-style {
                .mwe-popups { opacity: 0; transform: scale(0.97); }
                .mwe-popups.flipped_y { transform: translateY(-100%) scale(0.97); }
            }
            @media (prefers-reduced-motion: reduce) {
                @starting-style {
                    .mwe-popups { transform: none; }
                    .mwe-popups.flipped_y { transform: translateY(-100%); }
                }
            }

            @media (prefers-color-scheme: dark) {
                .wrap { text-shadow: none !important; }
                .mwe-popups { background: #2b2a33; }
                .mwe-popups .mwe-popups-container, .mwe-popups .mwe-popups-extract { color: #fbfbfe; }
                .mwe-popups.flipped_y:after { border-top-color: #2b2a33; }
                .mwe-popups.mwe-popups-no-image-tri:after { border-bottom-color: #2b2a33; }
                a { color: #8ab4f8; }
            }
        `;
        shadow.appendChild(style);

        var encapsulateDiv = document.createElement("div");
        encapsulateDiv.className = "wrap";
        encapsulateDiv.style = "all: initial;";
        shadow.appendChild(encapsulateDiv);


        var popupDiv = document.createElement("div");
        popupDiv.style = "font-family: arial,sans-serif; border-radius: 12px; border: 1px solid #a2a9b1; box-shadow: 0 0 17px rgba(0,0,0,0.5)";
        encapsulateDiv.appendChild(popupDiv);


        var contentContainer = document.createElement("div");
        contentContainer.className = "mwe-popups-container";
        popupDiv.appendChild(contentContainer);



        var content = document.createElement("div");
        content.className = "mwe-popups-extract";
        content.style = "line-height: 1.4; margin-top: 0px; margin-bottom: 11px; max-height: none";
        contentContainer.appendChild(content);


        var heading = document.createElement("h3");
        heading.style = "margin-block-end: 0px; display:inline-block;";
        heading.textContent = info.word;

        var meaning = document.createElement("p");
        meaning.style = "margin-top: 10px";
        meaning.textContent = "Looking up…";

        var moreInfo =document.createElement("a");
        moreInfo.href = `https://en.wiktionary.org/wiki/${encodeURIComponent(info.word)}`;
        moreInfo.style = "float: right; text-decoration: none;"
        moreInfo.target = "_blank";
        moreInfo.rel = "noopener";

        content.appendChild(heading);
        content.appendChild(meaning);
        content.appendChild(moreInfo);
        if(info.clientY < window.innerHeight/2){
            popupDiv.className = "mwe-popups mwe-popups-no-image-tri mwe-popups-is-not-tall";
            hostDiv.style.top = info.bottom + 10 + (info.height == 0 ? 8 : 0) + "px";
        } else {
            // flipped_y shifts the popup up by its own height (CSS), so this is where its bottom edge goes.
            popupDiv.className = "mwe-popups flipped_y mwe-popups-is-not-tall";
            hostDiv.style.top = info.top - 10 - (info.height == 0 ? 8 : 0) + "px";
        }

        document.body.appendChild(hostDiv);

        return { 
            heading, 
            meaning, 
            moreInfo
        };

    }

    function getSelectionCoords(selection) {
        var oRange = selection.getRangeAt(0); //get the text range
        var oRect = oRange.getBoundingClientRect();
        return oRect;
    }

    function appendToDiv(createdDiv, content){
        createdDiv.heading.textContent = content.word;
        createdDiv.meaning.textContent = content.meaning;
        createdDiv.moreInfo.textContent = "More »";
    }

    function noMeaningFound (createdDiv){
      createdDiv.heading.textContent = "Sorry";
      createdDiv.meaning.textContent = "No definition found.";
      createdDiv.moreInfo.textContent = "Search Wiktionary »";
    }

    function removeMeaning(event){
        var element = event.target;
        if(!element.classList.contains("dictionaryDiv")){
            removeAllPopups();
        }
    }

    function removeAllPopups(){
        document.querySelectorAll(".dictionaryDiv").forEach(function(Node){
            Node.remove();
        });
    }

    function isEditable(element){
        return element.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName);
    }

    document.addEventListener('dblclick', ((e) => {
        // Double-clicking in a text field means "select this word to edit it", not "define it".
        if (isEditable(e.target)) { return; }

        if (TRIGGER_KEY === 'none') {
            return showMeaning(e);
        }

        //e has property altKey, shiftKey, cmdKey representing they key being pressed while double clicking.
        if(e[`${TRIGGER_KEY}Key`]) {
            return showMeaning(e);
        }

        return;
    }));

    document.addEventListener('click', removeMeaning);
    document.addEventListener('keydown', (e) => { e.key === 'Escape' && removeAllPopups(); });

    (function () {
        let storageItem = browser.storage.local.get();

        storageItem.then((results) => {
            let interaction = results.interaction || { dblClick: { key: DEFAULT_TRIGGER_KEY }};

            LANGUAGE = results.language || DEFAULT_LANGUAGE;
            TRIGGER_KEY = interaction.dblClick.key;
        });
    })();
