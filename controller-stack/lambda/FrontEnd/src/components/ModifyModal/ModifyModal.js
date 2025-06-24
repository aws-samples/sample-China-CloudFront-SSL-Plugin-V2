import React, {useEffect, useState} from "react";
import axios from "axios";
import {
    Box,
    Button,
    ColumnLayout,
    FormField,
    Input,
    Modal,
    ProgressBar,
    SpaceBetween
} from "@cloudscape-design/components";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import {t} from "i18next";
import Flashbar from "@cloudscape-design/components/flashbar";
import {useDispatch, useSelector} from "react-redux";
import {setAlertModalMsg, setModifyModal, setRefreshProject} from "../../redux/actions";
import {v4 as uuidv4} from "uuid";

function ModifyModal(props) {
    const show = useSelector(state => state.stateRedux.openModifyModal)
    const dispatch = useDispatch();

    const ProjectName = 'name';
    const DomainNames = 'example.com OR example.com,www.example.com,*.example.cn';
    const RenewInterval = 'renew interval';

    const [nameInputText, setNameInputText] = useState('');
    const [DomainNamesInputText, setDomainNamesInputText] = useState('');
    const [RenewIntervalInputText, setRenewIntervalInputText] = useState('');
    const [DataLoading, setDataLoading] = useState(true);
    const [EnableSubmitButton, setEnableSubmitButton] = React.useState(true);

    const apiToken = useSelector(state => state.stateRedux.apiToken)

    const stackStateList =
        {
            "CREATE_COMPLETE": "success",
            "CREATE_FAILED": "error",
            "DELETE_COMPLETE": "success",
            "DELETE_FAILED": "error",
            "UPDATE_COMPLETE": "success",
            "UPDATE_FAILED": "error",
            "ROLLBACK_COMPLETE": "error",
            "ROLLBACK_FAILED": "error",
            "UPDATE_ROLLBACK_COMPLETE": "error",
            "UPDATE_ROLLBACK_FAILED": "error",
        }

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
    const [progress, setProgress] = React.useState(0);

    const totalTime = 60;
    const incrementPerSecond = 100 / totalTime;

    useEffect(() => {
        const now = new Date();
        console.log("Effect Modify timer", now.toLocaleTimeString(), isRunning, progress)
        let timer;
        if (Math.ceil(progress) === 34) {
            setIsRunning(false)
        }
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
            setNameInputText('');
            setDomainNamesInputText('');
            setRenewIntervalInputText('');
            setDataLoading(true);
            setEnableSubmitButton(true)
            resetTips()

            const selectedItems = props.selectedItems
            if (selectedItems.length === 1) {
                setNameInputText(selectedItems[0].Name)
                axios.post(
                    './api/check_stack_state',
                    {
                        ProjectName: selectedItems[0].Name,
                    },
                    {
                        headers: {
                            authorization: apiToken
                        }
                    }
                ).then((response) => {
                    const stack_info = response.data.stack_info;
                    setDomainNamesInputText(stack_info['domainName'])
                    setRenewIntervalInputText(stack_info['renewIntervalDays'])
                    setDataLoading(false);
                }).catch(err => {
                    handleClose()
                    dispatch(setAlertModalMsg({
                        type: "error",
                        visible: true,
                        title: err.response.status + " - " + err.response.statusText,
                        msg: err.response.data.message
                    }))
                });
            }
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

    const handleClose = (e) => {
        if (!(isRunning || e.detail.reason === "overlay")) {
            dispatch(setRefreshProject(uuidv4()))
            dispatch(setModifyModal(false))
        }
    }


    const handleModifySubmit = event => { //async()
        event.preventDefault();
        setIsRunning(true)
        setProgress(0)
        setTipsItems({
            display: true,
            type: "in-progress",
            header: "",
            progressShow: true,
            content: "",
            loading: true,
            progressBar: {
                label: "UPDATE_IN_PROGRESS",
                description: "",
                additionalInfo: ""
            }
        });

        setEnableSubmitButton(false)
        axios.post(
            './api/updateproject',
            {
                ProjectName: `${nameInputText}`,
                DomainNames: `${DomainNamesInputText}`,
                RenewInterval: `${RenewIntervalInputText}`,
            },
            {
                headers: {
                    authorization: apiToken
                }
            }
        ).then((response) => {
            checkStackState(nameInputText)
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
            setEnableSubmitButton(true)
        });
    };

    const checkStackState = async (projectName) => {
        try {
            const response = await axios.post(
                './api/check_stack_state',
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

            if (currentStatus in stackStateList) {
                if (stackStateList[currentStatus] === 'success') {
                    if (currentStatus === "CREATE_COMPLETE" || currentStatus === "UPDATE_COMPLETE") {
                        setProgress(35)
                        setTipsItems(prevState => ({
                            ...prevState,
                            type: stackStateList[currentStatus],
                            progressBar: {
                                label: currentStatus,
                                description: "",
                                additionalInfo: ""
                            }
                        }))
                        setIsRunning(true)
                        return checkCertState(projectName)
                    } else if (currentStatus === "DELETE_COMPLETE") {
                        setProgress(100)
                        setTipsItems(prevState => ({
                            ...prevState,
                            type: stackStateList[currentStatus],
                            loading: false,
                            progressBar: {
                                label: currentStatus,
                                description: "",
                                additionalInfo: ""
                            }
                        }))
                        return
                    }
                } else {
                    setIsRunning(false)
                    setEnableSubmitButton(true)
                    setTipsItems(prevState => ({
                        ...prevState,
                        type: stackStateList[currentStatus],
                        loading: false,
                        progressBar: {
                            label: currentStatus,
                            description: "",
                            additionalInfo: ""
                        }
                    }))
                    return
                }
            } else {
                setTipsItems(prevState => ({
                    ...prevState,
                    type: "in-progress",
                    loading: true,
                    progressBar: {
                        label: currentStatus,
                        description: "",
                        additionalInfo: ""
                    }
                }))
                await new Promise(resolve => setTimeout(resolve, 10000));
                return checkStackState(projectName);
            }
        } catch (err) {
            console.log(err.response);
            resetProgress()
            setEnableSubmitButton(true)
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
    };

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
                setEnableSubmitButton(true)
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
            setEnableSubmitButton(true)
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


    const inputExists = (nameInputText !== '' && DomainNamesInputText !== '' && RenewIntervalInputText !== '');
    let disableButton = true
    if (EnableSubmitButton && inputExists) {
        disableButton = false
    }

    return (
        <Modal
            size={"medium"}
            visible={show}
            onDismiss={handleClose}
            header={t('ModifyProject')}
        >
            {(
                <SpaceBetween size="m">
                    {}
                    {/*<form onSubmit={handleCreateSubmit}>*/}
                    <FormField label={t('ProjectName')}>
                        <ColumnLayout columns={1}>
                            <Input
                                placeholder={ProjectName}
                                disabled={true}
                                value={nameInputText}
                                ariaRequired={true}
                            />
                        </ColumnLayout>
                    </FormField>
                    <FormField label={t("DomainNames")}>
                        <ColumnLayout columns={1}>
                            {DataLoading ? (
                                <StatusIndicator type="loading"></StatusIndicator>
                            ) : (
                                <Input
                                    placeholder={DomainNames}
                                    onChange={event => setDomainNamesInputText(event.detail.value)}
                                    value={DomainNamesInputText}
                                    ariaRequired={true}
                                />
                            )}
                        </ColumnLayout>
                    </FormField>
                    <FormField label={t("RenewInterval")}>
                        <ColumnLayout columns={1}>
                            {DataLoading ? (
                                <StatusIndicator type="loading"></StatusIndicator>
                            ) : (
                                <Input
                                    type="number"
                                    inputMode="numeric"
                                    placeholder={RenewInterval}
                                    onChange={event => setRenewIntervalInputText(event.detail.value)}
                                    value={RenewIntervalInputText}
                                    ariaRequired={true}
                                />
                            )}
                        </ColumnLayout>
                    </FormField>
                    <Box float="right">
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button variant="normal" onClick={handleClose} disabled={isRunning}>
                                {t('Cancel')}
                            </Button>
                            <Button variant="primary" disabled={disableButton} data-testid="submit"
                                    onClick={handleModifySubmit}>
                                {t('Modify')}
                            </Button>
                        </SpaceBetween>
                    </Box>
                    {/*</form>*/}
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
                                dismissible: !tipsItems.loading,
                                onDismiss: () => resetTips(),
                            }]
                        }/>
                    </div>
                </SpaceBetween>
            )}
        </Modal>
    );
}

export default ModifyModal
