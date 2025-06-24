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
} from '../actionTypes'

const initialState = {
    apiToken: "",
    openTokenModal: true,
    alertModalMsg: {
        type: "info" | "success" | "error" | "warning",
        visible: false,
        title: "",
        msg: "",
    },
    refreshProject: "",
    refreshCert: "",
    refreshEmail: "",
    openCreateModal: false,
    openModifyModal: false,
    openDeleteModal: false,
    openCertListModal: {
        show:false,
        certs_list: null,
        iam_path: null,
        project_name: null
    },
    openRecertModal: {
        show: false,
        project_name: null
    },
    openDeleteCertModal: {
        show: false,
        item: null
    },
    openMailListModal: {
        show:false,
        project_name:null
    },
    openAddMailModal:  {
        show:false,
        project_name:null
    },
    openDeleteMailModal:  {
        show:false,
        item: null,
        project_name:null
    }
};

export default function stateReducer(state = initialState, action) {
    switch (action.type) {
        case SET_ALERT_MODAL_MSG: {
            const data = action.payload.data;
            return {
                ...state,
                alertModalMsg: data,
            };
        }
        case SET_API_TOKEN: {
            const data = action.payload.data;
            return {
                ...state,
                apiToken: data,
            };
        }
        case OPEN_TOKEN_MODAL: {
            const data = action.payload.data;
            return {
                ...state,
                openTokenModal: data,
            };
        }
        case SET_REFRESH_PROJECT: {
            const data = action.payload.data;
            return {
                ...state,
                refreshProject: data,
            };
        }
        case SET_REFRESH_CERT: {
            const data = action.payload.data;
            return {
                ...state,
                refreshCert: data,
            };
        }
        case SET_REFRESH_EMAIL: {
            const data = action.payload.data;
            return {
                ...state,
                refreshEmail: data,
            };
        }
        case OPEN_CREATE_MODAL: {
            const data = action.payload.data;
            return {
                ...state,
                openCreateModal: data,
            };
        }
        case OPEN_MODIFY_MODAL: {
            const data = action.payload.data;
            return {
                ...state,
                openModifyModal: data,
            };
        }
        case OPEN_DELETE_MODAL: {
            const data = action.payload.data;
            return {
                ...state,
                openDeleteModal: data,
            };
        }
        case OPEN_CERT_LIST_MODAL: {
            const data = action.payload.data;
            return {
                ...state,
                openCertListModal: data,
            };
        }
        case OPEN_RECERT_MODAL: {
            const data = action.payload.data;
            return {
                ...state,
                openRecertModal: data,
            };
        }
        case OPEN_DELETE_CERT_MODAL: {
            const data = action.payload.data;
            return {
                ...state,
                openDeleteCertModal: data,
            };
        }
        case OPEN_MAIL_LIST_MODAL: {
            const data = action.payload.data;
            return {
                ...state,
                openMailListModal: data,
            };
        }
        case OPEN_ADD_MAIL_MODAL: {
            const data = action.payload.data;
            return {
                ...state,
                openAddMailModal: data,
            };
        }
        case OPEN_DELETE_MAIL_MODAL: {
            const data = action.payload.data;
            return {
                ...state,
                openDeleteMailModal: data,
            };
        }
        default:
            return state;
    }
}
