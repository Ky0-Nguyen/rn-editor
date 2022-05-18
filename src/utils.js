import React, { Component, useState, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { actions, messages } from './const';
import { Keyboard, Platform, StyleSheet, TextInput, View } from 'react-native';
import { createHTML } from './editor';

export const onMessage = ({
    event , 
    props, 
    contentResolve, 
    contentReject,
    pendingContentHtml,
    selectionChangeListeners,
    focus,
    focusListeners,
    layout,
    setWebHeight
}) => {
    const {onFocus, onBlur, onChange, onPaste, onKeyUp, onKeyDown, onInput, onMessage, onCursorPosition} = props;
    try {
        const message = JSON.parse(event.nativeEvent.data);
        const data = message.data;
        switch (message.type) {
            case messages.CONTENT_HTML_RESPONSE:
                if (contentResolve) {
                    contentResolve(message.data);
                    contentResolve = undefined;
                    contentReject = undefined;
                    if (pendingContentHtml) {
                        clearTimeout(pendingContentHtml);
                        pendingContentHtml = undefined;
                    }
                }
                break;
            case messages.LOG:
                console.log('FROM EDIT:', ...data);
                break;
            case messages.SELECTION_CHANGE:
                const items = message.data;
                selectionChangeListeners.map(listener => {
                    listener(items);
                });
                break;
            case messages.CONTENT_FOCUSED:
                focus = true;
                focusListeners.map(da => da()); // Subsequent versions will be deleted
                onFocus?.();
                break;
            case messages.CONTENT_BLUR:
                focus = false;
                onBlur?.();
                break;
            case messages.CONTENT_CHANGE:
                onChange?.(data);
                break;
            case messages.CONTENT_PASTED:
                onPaste?.(data);
                break;
            case messages.CONTENT_KEYUP:
                onKeyUp?.(data);
                break;
            case messages.CONTENT_KEYDOWN:
                onKeyDown?.(data);
                break;
            case messages.ON_INPUT:
                onInput?.(data);
                break;
            case messages.OFFSET_HEIGHT:
                setWebHeight(data);
                break;
            case messages.OFFSET_Y:
                let offsetY = Number.parseInt(Number.parseInt(data) + layout.y || 0);
                offsetY > 0 && onCursorPosition(offsetY);
                break;
            default:
                onMessage?.(message);
                break;
        }
    } catch (e) {
        //alert('NON JSON MESSAGE');
    }
}