/**
 * Emoticon Shortcuts filter (:) -> :smile:)
 *
 * @param megaChat
 * @returns {EmoticonShortcutsFilter}
 * @constructor
 */
var EmoticonShortcutsFilter = function(megaChat) {
    var self = this;

    self.shortcuts = {
        ':)': ':slight_smile:',
        ':-)': ':slight_smile:',
        ':d': ':grinning:',
        ':-d': ':grinning:',
        ';)': ':wink:',
        ';-)': ':wink:',
        ';p': ':stuck_out_tongue_winking_eye:',
        ';-p': ':stuck_out_tongue_winking_eye:',
        ':p': ':stuck_out_tongue:',
        ':-p': ':stuck_out_tongue:',

        ':(': ':slight_frown:',
        ':\\': ':confused:',
        ':/': ':confused:',
        ':|': ':neutral_face:',
        'd:': ':anguished:',
        ':o': ':open_mouth:'
    };


    var escapedRegExps = [];
    $.each(self.shortcuts, function(shortcut, expanded) {

        escapedRegExps.push(
            "(^|\\W)(" + RegExpEscape(shortcut) + ")(?=(\\s|\\.|\\?|,|\\/|!|:|$))"
        );
    });

    var regExpStr = "(" + escapedRegExps.join("|") + ")";

    self.emoticonsRegExp = new RegExp(regExpStr, "gi");

    megaChat.on("onBeforeRenderMessage", function(e, eventData) {
        self.processMessage(e, eventData);
    });

    megaChat.on("onBeforeSendMessage", function(e, messageObject) {
        var formatted = self.processMessage(e, {
            'message': {
                'textContents': messageObject.textContents
            }
        });

        if (formatted) {
            messageObject.textContents = formatted;
        }
    });

    return this;
};

EmoticonShortcutsFilter._strStartsWithNSpaces = function(string) {
    for (var i = 0; i < string.length; i++) {
        if (string[i] !== " " && string[i] !== "\t" && string[i] !== "\n" && string[i] !== "\r") {
            return i;
        }
    }
    return string.length;
};

EmoticonShortcutsFilter._strEndsWithNSpaces = function(string) {
    for (var i = string.length - 1; i >= 0; i--) {
        if (string[i] !== " " && string[i] !== "\t" && string[i] !== "\n" && string[i] !== "\r") {
            return string.length - i - 1;
        }
    }
    return 0;
};

EmoticonShortcutsFilter.prototype.processMessage = function(e, eventData) {
    var self = this;

    if (eventData.message.decrypted === false) {
        return;
    }


    // ignore if emoticons are already processed
    if (!eventData.message.processedBy) {
        eventData.message.processedBy = {};
    }
    if (eventData.message.processedBy['emojiShrtFltr'] === true) {
        return;
    }

    // use the HTML version of the message if such exists (the HTML version should be generated by hooks/filters on the
    // client side.
    var textContents;
    if (eventData.message.textContents) {
        textContents = eventData.message.textContents;
    } else {
        return; // not yet decrypted.
    }


    var messageContents = eventData.message.messageHtml ? eventData.message.messageHtml : textContents;

    if (!messageContents) {
        return; // ignore, maybe its a system message (or composing/paused composing notification)
    }

    // Escape :*: emoticons -> tempEmoticons
    var tmpReplacements = [];
    messageContents = messageContents.replace(
        /(\:[a-zA-Z\_]{1,}\:)/g,
        function($0) {
            var x = tmpReplacements.push($0) - 1;
            return "$ee:" + x + "$";
        });

    messageContents = messageContents.replace(self.emoticonsRegExp, function(match) {
        var foundSlug = $.trim(match.toLowerCase());
        var startingSpaces = EmoticonShortcutsFilter._strStartsWithNSpaces(match);
        var prefix = "";
        var whatsLeftStr = match;
        if (startingSpaces !== 0) {
            whatsLeftStr = match.substr(startingSpaces);
            prefix = match.substr(0, startingSpaces);
        }

        var endingSpaces = EmoticonShortcutsFilter._strEndsWithNSpaces(whatsLeftStr);

        var suffix = "";
        if (endingSpaces !== 0) {
            suffix = whatsLeftStr.substr(endingSpaces);
        }

        return self.shortcuts[foundSlug] ?
            prefix + self.shortcuts[foundSlug] + suffix :
            match;
    });

    // revert back the :*: emoticons
    messageContents = messageContents.replace(
        /(\$ee\:(\d{1,})\$)/g,
        function($0, $1, $2) {
            return tmpReplacements[$2] ? tmpReplacements[$2] : $0;
        });

    eventData.message.messageHtml = messageContents;
    eventData.message.processedBy['emojiShrtFltr'] = true;

    return messageContents;
};
