import {
    OPEN_ADD_MAIL_MODAL,
    OPEN_CERT_LIST_MODAL,
    OPEN_CREATE_MODAL,
    OPEN_DELETE_CERT_MODAL,
    OPEN_DELETE_MAIL_MODAL,
    OPEN_DELETE_MODAL,
    OPEN_MAIL_LIST_MODAL,
    OPEN_MODIFY_MODAL,
    OPEN_RECERT_MODAL,
    OPEN_TOKEN_MODAL,
    SET_ALERT_MODAL_MSG,
    SET_API_TOKEN,
    SET_REFRESH_CERT,
    SET_REFRESH_EMAIL,
    SET_REFRESH_PROJECT
} from './actionTypes'


export const setApiToken = data => ({
    type: SET_API_TOKEN,
    payload: {
        data
    }
});

export const openTokenModal = data => ({
    type: OPEN_TOKEN_MODAL,
    payload: {
        data
    }
});

export const setAlertModalMsg = data => ({
    type: SET_ALERT_MODAL_MSG,
    payload: {
        data
    }
});

export const setRefreshProject = data => ({
    type: SET_REFRESH_PROJECT,
    payload: {
        data
    }
});

export const setRefreshCert = data => ({
    type: SET_REFRESH_CERT,
    payload: {
        data
    }
});

export const setRefreshEmail = data => ({
    type: SET_REFRESH_EMAIL,
    payload: {
        data
    }
});

export const setCreateModal = data => ({
    type: OPEN_CREATE_MODAL,
    payload: {
        data
    }
});

export const setModifyModal = data => ({
    type: OPEN_MODIFY_MODAL,
    payload: {
        data
    }
});

export const setDeleteModal = data => ({
    type: OPEN_DELETE_MODAL,
    payload: {
        data
    }
});

export const setCertListModal = data => ({
    type: OPEN_CERT_LIST_MODAL,
    payload: {
        data
    }
});

export const setRecertModal = data => ({
    type: OPEN_RECERT_MODAL,
    payload: {
        data
    }
});

export const setDeleteCertModal = data => ({
    type: OPEN_DELETE_CERT_MODAL,
    payload: {
        data
    }
});

export const setMailListModal = data => ({
    type: OPEN_MAIL_LIST_MODAL,
    payload: {
        data
    }
});

export const setAddMailModal = data => ({
    type: OPEN_ADD_MAIL_MODAL,
    payload: {
        data
    }
});

export const setDeleteMailModal = data => ({
    type: OPEN_DELETE_MAIL_MODAL,
    payload: {
        data
    }
});

