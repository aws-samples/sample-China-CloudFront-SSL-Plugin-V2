import {Alert, Modal} from "@cloudscape-design/components";
import React, {useEffect} from "react";
import {useSelector} from "react-redux";
import {useDispatch} from "react-redux";
import {setAlertModalMsg} from "../redux/actions";


function AlertModal() {

    const alertModalMsg = useSelector(state => state.stateRedux.alertModalMsg)
    const dispatch = useDispatch();
    const handleClose = () => {
        dispatch(setAlertModalMsg({
            type: "Info" | "Success" | "Error" | "Warning",
            visible: false,
            title: "",
            msg: "",
            element:document.getElementById("main-page")
        }))
    }

    useEffect(() => {
        console.log("AlertModal->useEffect")
    }, []);

    return (
        <Modal
            onDismiss={handleClose}
            size="medium"
            visible={alertModalMsg.visible}
            header={alertModalMsg.title}
            // modalRoot={alertModalMsg.element}
        >
            <Alert
                type={alertModalMsg.type}
                header={alertModalMsg.msg}
            >
            </Alert>
        </Modal>
    );
}


export default AlertModal
