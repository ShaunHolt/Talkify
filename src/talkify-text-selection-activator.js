talkify = talkify || {};

talkify.selectionActivator = function () {
    var forbiddenElementsString = ['img', 'map', 'object', 'script', 'button', 'input', 'select', 'textarea', 'style', 'code', 'rp', 'rt'];
    var timeoutId, playlist, player, originalElement, x, y, activatorHtml, controlcenterHtml, currentSelection;
    var orchestrateTimeout;
    var currentContext = {};
    var settings = {
        exclude: [],
        enhancedVisibility: false,
        voice: { name: 'Zira' },
        highlightText: false,
        buttonText: "Listen"
    };

    var validNodeTypes = [1, 3];

    function getElementsInSelection() {
        if (!currentSelection) {
            return [];
        }

        var anchorNode = currentContext.anchorNode;

        if (!anchorNode) {
            return [];
        }

        var nodes = getNodesInSelection(currentContext.range.commonAncestorContainer, currentContext.leftToRight);

        return nodes;
    }

    function createItemsFromNodes(nodes) {
        var items = [];

        if (nodes.length === 1) {
            return [surroundNode(nodes[0], currentContext.range.startOffset, currentContext.range.endOffset)];
        }

        for (var i = 0; i < nodes.length; i++) {
            if (i === 0) {
                if (currentContext.leftToRight) {
                    items.push(surroundNode(nodes[i], currentContext.anchorOffset, currentContext.anchorNode.textContent.length))
                } else {
                    items.push(surroundNode(nodes[i], currentContext.focusOffset, currentContext.focusNode.textContent.length))
                }

                continue;
            }

            if (i === nodes.length - 1) {
                if (currentContext.leftToRight) {
                    items.push(surroundNode(nodes[i], 0, currentContext.focusOffset))
                }
                else {
                    items.push(surroundNode(nodes[i], 0, currentContext.anchorOffset))
                }

                continue;
            }

            items.push(surroundNode(nodes[i], 0, 0))
        }

        console.log(items);

        return items;
    }

    function getNodesInSelection(element, leftToRight) {
        if (element === document.body.parentElement) {
            return [];
        }

        var nodes = [];

        var isExcluded = settings.exclude.filter(function (x) {
            return x.contains(currentContext.anchorNode);
        }).length > 0;

        isExcluded = isExcluded || settings.exclude.indexOf(currentContext.anchorNode) !== -1 || validNodeTypes.indexOf(currentContext.anchorNode.nodeType) === -1;

        // if (!isExcluded) {
        //     nodes.push(currentContext.anchorNode);
        // }

        nodes = nodes.concat(getNodesInBetween(element, leftToRight));

        var isLastExcluded = settings.exclude.filter(function (x) {
            return x.contains(currentContext.focusNode);
        }).length > 0;

        isLastExcluded = isLastExcluded || settings.exclude.indexOf(currentContext.focusNode) !== -1 || validNodeTypes.indexOf(currentContext.focusNode.nodeType) === -1;

        // if (currentContext.anchorNode !== currentContext.focusNode && !isLastExcluded) {
        //     nodes.push(currentContext.focusNode);
        // }

        if (!leftToRight) {
            nodes.reverse();
        }

        return nodes;
    }

    function getNodesInBetween(element, leftToRight) {
        var nodes = [];

        if(element.nodeType === 3){
            return [element];
        }

        //TODO: lefttoright?
        //TODO: Ligger i getNodesInBetween. Hänsyn till first och last node
        var inlineGroups = getInlineGroups(element.childNodes);

        for (var i = 0; i < element.childNodes.length; i++) {
            var node = leftToRight ?
                element.childNodes[i] :
                element.childNodes[element.childNodes.length - 1 - i];

            var tagName = node.tagName != undefined ? node.tagName.toLowerCase() : undefined;

            if (forbiddenElementsString.indexOf(tagName) !== -1 || settings.exclude.indexOf(node) !== -1) {
                continue;
            }

            if (validNodeTypes.indexOf(node.nodeType) === -1) {
                continue;
            }

            if (node.textContent.trim() === "") {
                continue;
            }

            var group = inlineGroups.filter(function (x) { return x.indexOf(node) > -1; })[0];

            if (group) {
                console.log("group found, starting node", node, "length: ", group);
                nodes.push(group);

                var indexAfterGroup = i + group.length;
                i = indexAfterGroup;

                continue;
            }

            if (node.nodeType === 1) {
                nodes = nodes.concat(getNodesInBetween(node, leftToRight));
            }

            // if (node.contains(currentContext.anchorNode)) {
            //     continue;
            // }

            // if (node.contains(currentContext.focusNode)) {
            //     continue;
            // }

            if (node.nodeType === 1) {
                continue;
            }

            if (currentSelection.containsNode(node, true)) {
                nodes.push(node);
            }
        }

        return nodes;
    }

    function getInlineGroups(nodes) {
        var inlineElements = ['a', 'span', 'b', 'big', 'i', 'small', 'tt', 'abbr', 'acronym', 'cite', 'code', 'dfn', 'em', 'kbd', 'strong', 'samp', 'var', 'a', 'bdo', 'q', 'sub', 'sup', 'label'];

        var groups = [];

        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];

            if (!currentSelection.containsNode(node, true)) {
                continue;
            }

            var isBlockElement = node.nodeType === 1 && inlineElements.indexOf(node.tagName.toLowerCase()) === -1;

            if (isBlockElement) {
                continue;
            }

            if (validNodeTypes.indexOf(node.nodeType) === -1) {
                continue;
            }

            if (node.textContent.trim() === "") {
                continue;
            }

            var group = [];
            group.push(node);

            while (i < nodes.length && 
                    node.nextSibling && 
                    node.nextSibling.textContent.trim() !== "" && 
                    currentSelection.containsNode(node.nextSibling, true) &&                    
                    (node.nextSibling.nodeType === 3 || inlineElements.indexOf((node.nextSibling.tagName || "").toLowerCase()) !== -1)) {
                group.push(node.nextSibling);

                i++;
                node = nodes[i];
            }

            if (group.length > 1) {
                groups.push(group);
            }
        }

        return groups;
    }

    function surroundNode(node, startOffset, endOffset) {
        var range = document.createRange();
        var newParent = document.createElement('span');

        if (Array.isArray(node)) {
            node[0].parentNode.insertBefore(newParent, node[0]);

            for (var i = 0; i < node.length; i++) {
                newParent.appendChild(node[i].cloneNode(true));

                node[i].parentNode.removeChild(node[i]);
            }

            return newParent;
        }

        if (startOffset === 0 && endOffset === 0) {
            if (node.nodeType === 1) {
                return node;
            } else {
                range.setStart(node, 0);
                range.setEnd(node, node.textContent.length);
                range.surroundContents(newParent);
            }

        } else {
            if (node.nodeType === 1) {
                return node;
            }
            else {
                range.setStart(node, startOffset);
                range.setEnd(node, endOffset);
                range.surroundContents(newParent);
            }
        }

        return newParent;
    }

    function activate() {
        if (settings.exclude && NodeList.prototype.isPrototypeOf(settings.exclude)) {
            settings.exclude = Array.from(settings.exclude);
        }

        document.onmouseup = document.onkeyup = function (e) {
            currentSelection = window.getSelection();

            if (currentSelection.type === "Range" && currentSelection.toString().trim()) {
                if (currentContext.anchorNode === currentSelection.anchorNode && currentContext.focusNode === currentSelection.focusNode) {
                    return;
                }

                if (activatorHtml && (activatorHtml.contains(currentSelection.focusNode) || activatorHtml.contains(currentSelection.anchorNode))) {
                    return;
                }

                if (currentContext && currentContext.active) {
                    console.log("we are active");
                    return;
                }

                if (orchestrateTimeout) {
                    clearTimeout(orchestrateTimeout);
                }

                orchestrateTimeout = setTimeout(orchestrateAfterSelection, 200);
            }
        };

        document.addEventListener('mousemove', onMouseUpdate, false);
        document.addEventListener('mouseenter', onMouseUpdate, false);
    }

    function orchestrateAfterSelection() {
        if (currentSelection.rangeCount === 0) {
            return;
        }

        removeActivator();

        currentContext = {
            anchorNode: currentSelection.anchorNode,
            focusNode: currentSelection.focusNode,
            anchorOffset: currentSelection.anchorOffset,
            focusOffset: currentSelection.focusOffset,
            range: currentSelection.getRangeAt(0),
            text: currentSelection.toString().replace(/\s/g, ""),
            active: false
        };

        var position = currentContext.anchorNode.compareDocumentPosition(currentContext.focusNode);
        currentContext.leftToRight = !(position & Node.DOCUMENT_POSITION_PRECEDING);

        currentContext.nodes = getElementsInSelection();

        console.log(currentContext.nodes);

        if (!currentContext.nodes.length) {
            currentContext = {};
            return;
        }

        renderActivator();

        activatorHtml.addEventListener('click', activateControlcenter, false);

        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(function () {
            removeActivator();
            currentContext = {};
        }, 2000);
    }

    function activateControlcenter() {
        activatorHtml.removeEventListener("click", activateControlcenter, false);
        removeControlcenter();

        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        currentContext.active = true;

        if (currentContext.range.commonAncestorContainer.nodeType !== 1) {
            originalElement = currentContext.range.commonAncestorContainer.parentElement.cloneNode(true);
        }
        else {
            originalElement = currentContext.range.commonAncestorContainer.cloneNode(true);
        }

        var elements = createItemsFromNodes(currentContext.nodes);

        renderControlcenter();
        removeActivator();

        if (player) {
            player.dispose();
        }

        player = new talkify.TtsPlayer();

        if (settings.highlightText) {
            player.enableTextHighlighting();
        }

        player.forceVoice(settings.voice);

        if (settings.enhancedVisibility) {
            player.enableEnhancedTextVisibility();
        }

        player.useControlCenter("local", controlcenterHtml);

        if (playlist) {
            playlist.dispose();
        }

        playlist = new talkify.playlist()
            .begin()
            .usingPlayer(player)
            .withElements(elements)
            .subscribeTo({ onEnded: disposeControlCenter })
            .build();
    }

    function disposeControlCenter() {
        player.dispose();
        playlist.dispose();
        removeControlcenter();

        if (currentContext.range.commonAncestorContainer.nodeType !== 1) {
            currentContext.range.commonAncestorContainer.parentElement.innerHTML = originalElement.innerHTML;
        }
        else {
            currentContext.range.commonAncestorContainer.innerHTML = originalElement.innerHTML;
        }

        currentContext = {};
    }

    function removeControlcenter() {
        if (!controlcenterHtml) {
            return;
        }

        controlcenterHtml.innerHTML = "";
        document.body.removeChild(controlcenterHtml);
        controlcenterHtml = null;
    }

    function removeActivator() {
        if (!activatorHtml) {
            return;
        }

        activatorHtml.innerHTML = "";

        if (activatorHtml.parentElement) {
            document.body.removeChild(activatorHtml);
        }

        activatorHtml = null;
    }

    function onMouseUpdate(e) {
        x = e.clientX;
        y = e.clientY;
    }

    function renderActivator() {
        var div = document.createElement('div');
        div.classList.add("talkify-activator-wrapper");

        div.innerHTML = '<div class="talkify-popup-activator">\
                            <button title="Talkify">\
                                <i class="fas fa-play"></i>' +
                                settings.buttonText +
                            '</button>\
                        </div>';

        activatorHtml = div;

        document.body.appendChild(activatorHtml);

        var preferDown = currentContext.leftToRight || y < 50;

        if (x >= window.outerWidth - 300) {
            x = x - (300 - (window.outerWidth - x));
        }

        activatorHtml.style.left = x + 'px';
        activatorHtml.style.top = (y + (preferDown ? 15 : -45)) + 'px';        
    }

    function renderControlcenter() {
        controlcenterHtml = document.createElement('div');
        controlcenterHtml.classList.add("talkify-controlcenter-wrapper");

        var closeButton = document.createElement('div');
        closeButton.classList.add('talkify-close');

        closeButton.innerHTML = "<i class='fa fa-times'/>";

        closeButton.addEventListener("click", disposeControlCenter);

        controlcenterHtml.appendChild(closeButton);

        controlcenterHtml.style.left = activatorHtml.style.left;
        controlcenterHtml.style.top = activatorHtml.style.top;

        document.body.appendChild(controlcenterHtml);
    }

    return {
        withEnhancedVisibility: function () {
            settings.enhancedVisibility = true;
            return this;
        },
        withVoice: function (voice) {
            settings.voice = voice;
            return this;
        },
        withTextHighlighting: function () {
            settings.highlightText = true;
            return this;
        },
        withButtonText: function(text){
            settings.buttonText = text;
            return this;
        },
        excludeElements: function (domElements) {
            settings.exclude = domElements;
            return this;
        },
        activate: activate
    }
}();