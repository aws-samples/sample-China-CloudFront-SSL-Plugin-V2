import React, {useEffect, useState} from "react";
import axios from "axios";
import {Box, Button, Modal, ProgressBar, SpaceBetween} from "@cloudscape-design/components";
import {t} from "i18next";
import Flashbar from "@cloudscape-design/components/flashbar";
import {useDispatch, useSelector} from "react-redux";
import {setRecertModal, setRefreshCert} from "../../redux/actions";
import {v4 as uuidv4} from "uuid";

function ReCertModal() {
    const data = useSelector(state => state.stateRedux.openRecertModal)
    const show = data.show
    const project_name = data.project_name
    const dispatch = useDispatch();


    const apiToken = useSelector(state => state.stateRedux.apiToken)

    const certStateList =
        {
            "Processing": "in-progress",
            "Replace failed": "warning",
            "Delete IAM failed": "warning",
            "Succeeded": "success",
        }

    const [tipsItems, setTipsItems] = React.useState({
        display: false,
        type: "info",
        header: "",
        progressShow: false,
        content: "",
        loading: true,
        progressBar: {
            label: "",
            description: "",
            additionalInfo: ""
        }
    });
    const [isRunning, setIsRunning] = useState(false);
    const [disableButton, setDisableButton] = useState(false);
    const [progress, setProgress] = React.useState(0);

    const totalTime = 60;
    const incrementPerSecond = 100 / totalTime;

    useEffect(() => {
        const now = new Date();
        console.log("Effect ReCert timer", now.toLocaleTimeString(), isRunning, progress)
        let timer;
        if (isRunning && Math.ceil(progress) < 99) {
            timer = setInterval(() => {
                setProgress(prevProgress => {
                    const newProgress = prevProgress + incrementPerSecond;
                    return newProgress > 100 ? 100 : newProgress
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isRunning, progress, incrementPerSecond]);

    useEffect(() => {
        if (show) {
            console.log("ModifyModal->useEffect")
            setDisableButton(false)
            resetTips()
        }
    }, [show]);

    const resetProgress = () => {
        setIsRunning(false);
        setProgress(0)
    }

    const resetTips = () => {
        setTipsItems({
            display: false,
            type: "info",
            header: "",
            progressShow: false,
            content: "",
            loading: true,
            progressBar: {
                label: "",
                description: "",
                additionalInfo: ""
            }
        })
        resetProgress()
    }

    const handleConfirm = (e) => {
        if (project_name && project_name.length > 0) {
            setIsRunning(true)
            setDisableButton(true)
            setProgress(0)
            setTipsItems({
                display: true,
                type: "in-progress",
                header: "",
                progressShow: true,
                content: "",
                loading: true,
                progressBar: {
                    label: "Trigger CertBot Function...",
                    description:"",
                    additionalInfo: ""
                }
            });
            axios.post(
                './api/triggercertbot',
                {
                    ProjectName: project_name,
                },
                {
                    headers: {
                        authorization: apiToken
                    }
                }
            ).then((response) => {
                checkCertState(project_name)
            }).catch(err => {
                console.log(err.response);
                resetProgress()
                setTipsItems({
                    display: true,
                    type: "error",
                    header: err.response.status + " - " + err.response.statusText,
                    progressShow: false,
                    content: err.response.data.message,
                    loading: false,
                    progressBar: {
                        label: "",
                        description: "",
                        additionalInfo: ""
                    }
                });
            });
        }else{
            resetProgress()
            setTipsItems({
                display: true,
                type: "error",
                header: "Project Name is Empty",
                progressShow: false,
                content: "",
                loading: false,
                progressBar: {
                    label: "",
                    description: "",
                    additionalInfo: ""
                }
            });
        }
    }

    const handleClose = (e) => {
        if (!isRunning) {
            dispatch(setRefreshCert(uuidv4()))
            dispatch(setRecertModal({
                show: false,
                project_name: null
            }))
        }
    }

    const checkCertState = async (projectName) => {
        try {
            const response = await axios.post(
                './api/check_cert_state',
                {
                    ProjectName: projectName,
                },
                {
                    headers: {
                        authorization: apiToken
                    }
                }
            );
            const currentStatus = response.data.message;

            if (currentStatus.Status && currentStatus.Status === "Processing") {
                let status = currentStatus.Status
                setTipsItems(prevState => ({
                    ...prevState,
                    type: certStateList[status],
                    loading: true,
                    progressBar: {
                        label: "SSL Cert Issuance " + status,
                        description: "",
                        additionalInfo: ""
                    }
                }))
                await new Promise(resolve => setTimeout(resolve, 10000));
                return checkCertState(projectName);
            } else {
                setIsRunning(false)
                let desc = ""
                if (currentStatus.Status === "Succeeded") {
                    setProgress(100)
                    desc = "Please Check Your Mail Box"
                }
                if (currentStatus.Status === "Replace failed") {
                    desc = "Please Check CloudFront and Associated IAM SSL Cert"
                }
                if (currentStatus.Status === "Delete IAM failed") {
                    desc = "Please Check CloudFront and Associated IAM SSL Cert"
                }
                let status = currentStatus.Status
                setTipsItems(prevState => ({
                    ...prevState,
                    type: certStateList[status] || "error",
                    loading: false,
                    progressBar: {
                        label: status,
                        description: desc,
                        additionalInfo: currentStatus.ReplaceMsg
                    }
                }))
                return
            }
        } catch (err) {
            console.log(err.response);
            resetProgress()
            setTipsItems({
                display: true,
                type: "error",
                header: err.response.status + " - " + err.response.statusText,
                progressShow: false,
                content: err.response.data.message,
                loading: false,
                progressBar: {
                    label: "",
                    description: "",
                    additionalInfo: ""
                }
            });
        }
    }

    return (
        <Modal
            size={"medium"}
            visible={show}
            onDismiss={handleClose}
            footer={
                <Box float="right">
                    <SpaceBetween direction="horizontal" size="xs">
                        <Button variant="link" disabled={isRunning} onClick={handleClose}> {t('Cancel')}</Button>
                        <Button variant="primary" disabled={disableButton} onClick={handleConfirm}> {t('Confirm')}</Button>
                    </SpaceBetween>
                </Box>
            }
            header={t('Confirm') + t('ReCert') + "?"}
        >
            {(
                <SpaceBetween size="m">
                    <div style={{"display": tipsItems.display ? "initial" : "none"}}>
                        <Flashbar items={
                            [{
                                type: tipsItems.type,
                                header: tipsItems.header,
                                content: (
                                    tipsItems.progressShow ?
                                        (<ProgressBar
                                            label={tipsItems.progressBar.label}
                                            description={tipsItems.progressBar.description}
                                            value={progress}
                                            additionalInfo={
                                                typeof tipsItems.progressBar.additionalInfo === 'object'
                                                    ?
                                                    <pre style={{
                                                        whiteSpace: 'pre-wrap',
                                                        wordWrap: 'break-word'
                                                    }}>{JSON.stringify(tipsItems.progressBar.additionalInfo, null, 1)}</pre>
                                                    : tipsItems.progressBar.additionalInfo
                                            }
                                            variant="flash"
                                        />) : tipsItems.content
                                ),
                                loading: tipsItems.loading,
                                dismissible: false,
                                onDismiss: () => resetTips(),
                            }]
                        }/>
                    </div>
                </SpaceBetween>
            )}
        </Modal>
    );
}

export default ReCertModal
