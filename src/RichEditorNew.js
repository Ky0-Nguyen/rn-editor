import React, {Component, useState, useEffect} from 'react';
import {WebView} from 'react-native-webview';
import {actions, messages} from './const';
import {Keyboard, Platform, StyleSheet, TextInput, View} from 'react-native';
import {createHTML} from './editor';
import {onMessage} from './utils';

const PlatformIOS = Platform.OS === 'ios';

const RichEditor = props => {
    const {
        editorStyle: {
            backgroundColor,
            color,
            placeholderColor,
            initialCSSText,
            cssText,
            contentCSSText,
            caretColor,
        } = {},
        html,
        pasteAsPlainText,
        onPaste,
        onKeyUp,
        onKeyDown,
        onInput,
        enterKeyHint,
        autoCapitalize,
        autoCorrect,
        defaultParagraphSeparator,
        firstFocusEnd,
        useContainer,
        initialHeight,
    } = props;

    const [htmlState, setHtml] = useState({
        html:
            html ||
            createHTML({
                backgroundColor,
                color,
                caretColor,
                placeholderColor,
                initialCSSText,
                cssText,
                contentCSSText,
                pasteAsPlainText,
                pasteListener: !!onPaste,
                keyUpListener: !!onKeyUp,
                keyDownListener: !!onKeyDown,
                inputListener: !!onInput,
                enterKeyHint,
                autoCapitalize,
                autoCorrect,
                defaultParagraphSeparator,
                firstFocusEnd,
                useContainer,
            }),
    });

    let unmount = false;
    let keyOpen = false;
    let focus = false;
    let layout = {};
    let selectionChangeListeners = [];
    let focusListeners = [];
    let keyboardEventListeners = [];
    let contentResolve = undefined;
    let contentReject = undefined;
    let pendingContentHtml = undefined;
    let webviewBridge = null;

    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [heightState, setHeight] = useState(initialHeight);

    useEffect(() => {
        unmount = false;
        if (PlatformIOS) {
            keyboardEventListeners = [
                Keyboard.addListener('keyboardWillShow', onKeyboardWillShow),
                Keyboard.addListener('keyboardWillHide', onKeyboardWillHide),
            ];
        } else {
            keyboardEventListeners = [
                Keyboard.addListener('keyboardDidShow', onKeyboardWillShow),
                Keyboard.addListener('keyboardDidHide', onKeyboardWillHide),
            ];
        }
        return () => {
            unmount = true;
            keyboardEventListeners.forEach(eventListener => eventListener.remove());
        };
    }, []);

    const onKeyboardWillShow = () => {
        keyOpen = true;
    };

    const onKeyboardWillHide = () => {
        keyOpen = false;
    };

    const onMessageCall = event => {
        onMessage({
            event,
            props,
            focus,
            layout,
            contentResolve,
            contentReject,
            selectionChangeListeners,
            pendingContentHtml,
            focusListeners,
        });
    };

    const setWebHeight = height => {
        const {onHeightChange, useContainer, initialHeight} = props;
        if (height !== heightState) {
            const maxHeight = Math.max(height, initialHeight);
            if (!unmount && useContainer && maxHeight >= initialHeight) {
                setHeight(maxHeight);
            }
            onHeightChange && onHeightChange(height);
        }
    };

    const sendAction = (type, action, data, options) => {
        let jsonString = JSON.stringify({type, name: action, data, options});
        if (!unmount && webviewBridge) {
            webviewBridge.postMessage(jsonString);
        }
    };

    const onViewLayout = ({nativeEvent: {layout: layoutReal}}) => {
        layout = layoutReal;
    };

    const renderWebView = () => {
        const {html, editorStyle, useContainer, style, ...rest} = props;
        return (
            <>
                <WebView
                    useWebKit={true}
                    scrollEnabled={false}
                    hideKeyboardAccessoryView={true}
                    keyboardDisplayRequiresUserAction={false}
                    nestedScrollEnabled={!useContainer}
                    style={[styles.webview, style]}
                    {...rest}
                    ref={that.setRef}
                    onMessage={that.onMessage}
                    originWhitelist={['*']}
                    dataDetectorTypes={'none'}
                    domStorageEnabled={false}
                    bounces={false}
                    javaScriptEnabled={true}
                    source={htmlState}
                    onLoad={that.init}
                />
                {Platform.OS === 'android' && <TextInput ref={ref => (that._input = ref)} style={styles._input} />}
            </>
        );
    };

    const registerToolbar = listener => {
        selectionChangeListeners = [...this.selectionChangeListeners, listener];
    };

    const setContentFocusHandler = listener => {
        focusListeners.push(listener);
    };

    const setContentHTML = html => {
        sendAction(actions.content, 'setHtml', html);
    };

    const setPlaceholder = placeholder => {
        sendAction(actions.content, 'setPlaceholder', placeholder);
    };

    const setContentStyle = styles => {
        sendAction(actions.content, 'setContentStyle', styles);
    };

    const setDisable = dis => {
        sendAction(actions.content, 'setDisable', !!dis);
    };

    const blurContentEditor = () => {
        sendAction(actions.content, 'blur');
    };

    const focusContentEditor = () => {
        showAndroidKeyboard();
        sendAction(actions.content, 'focus');
    };

    const showAndroidKeyboard = () => {
        if (Platform.OS === 'android') {
            !keyOpen && input.focus();
            webviewBridge.requestFocus && webviewBridge.requestFocus();
        }
    };

    const insertImage = (attributes, style) => {
        sendAction(actions.insertImage, 'result', attributes, style);
    };

    const insertVideo = (attributes, style) => {
        sendAction(actions.insertVideo, 'result', attributes, style);
    };

    const insertText = text => {
        sendAction(actions.insertText, 'result', text);
    };

    const insertHTML = html => {
        sendAction(actions.insertHTML, 'result', html);
    };

    const insertLink = (title, url) => {
        if (url) {
            showAndroidKeyboard();
            sendAction(actions.insertLink, 'result', {title, url});
        }
    };

    const preCode = type => {
        sendAction(actions.code, 'result', type);
    };

    const setFontSize = size => {
        sendAction(actions.fontSize, 'result', size);
    };

    const setForeColor = color => {
        sendAction(actions.foreColor, 'result', color);
    };

    const setHiliteColor = color => {
        sendAction(actions.hiliteColor, 'result', color);
    };

    const setFontName = name => {
        sendAction(actions.fontName, 'result', name);
    };

    const commandDOM = command => {
        if (command) {
            sendAction(actions.content, 'commandDOM', command);
        }
    };

    const command = command => {
        if (command) {
            sendAction(actions.content, 'command', command);
        }
    };

    const dismissKeyboard = () => {
        focus ? blurContentEditor() : Keyboard.dismiss();
    };

    const init = () => {
        const {initialFocus, initialContentHTML, placeholder, editorInitializedCallback, disabled} = props;
        initialContentHTML && setContentHTML(initialContentHTML);
        placeholder && setPlaceholder(placeholder);
        setDisable(disabled);
        editorInitializedCallback();
        initialFocus && !disabled && focusContentEditor();
        sendAction(actions.init);
    };
    const getContentHtml = async () => {
        return new Promise((resolve, reject) => {
            contentResolve = resolve;
            contentReject = reject;
            sendAction(actions.content, 'postHtml');

            pendingContentHtml = setTimeout(() => {
                if (contentReject) {
                    contentReject('timeout');
                }
            }, 5000);
        });
    };

    const isKeyboardOpen = () => {
        return keyOpen;
    };

    const {style} = props;
    return useContainer ? (
        <View style={[style, {height: heightState}]} onLayout={this.onViewLayout}>
            {renderWebView()}
        </View>
    ) : (
        renderWebView()
    );
};

RichEditor.defaultProps = {
    contentInset: {},
    style: {},
    placeholder: '',
    initialContentHTML: '',
    initialFocus: false,
    disabled: false,
    useContainer: true,
    pasteAsPlainText: false,
    autoCapitalize: 'off',
    defaultParagraphSeparator: 'div',
    editorInitializedCallback: () => {},
    initialHeight: 0,
};
export default RichEditor;
