"use strict"

function findElement(querySelector) {
    let elements = $(querySelector)

    if (!elements.length) {
        const wc = $('privacy-web-feed')[0]?.shadowRoot

        if (wc) {
            elements = $(wc).find(querySelector)
        }
    }

    if (!elements.length) {
        const wc = $('privacy-web-timeline')[0]?.shadowRoot

        if (wc) {
            elements = $(wc).find(querySelector)
        }
    }

    return elements
}

function alert(msg, callback) {
    swal({
        title: $i18nShared.notice,
        text: msg,
        icon: "info",
        buttons: {
            confirm: {
                text: "OK",
                value: true,
                visible: true,
                className: "",
                closeModal: true
            }
        }
    }).then(callback)
} 