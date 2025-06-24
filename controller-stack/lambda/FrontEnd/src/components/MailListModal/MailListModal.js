import {useTranslation} from "react-i18next";
import {Box, Button, Header, Modal, SpaceBetween, Table} from "@cloudscape-design/components";
import React, {useEffect, useState} from "react";
import DeleteEmailModal from "../DeleteMailModal/DeleteMailModal";
import AddEmailModal from "../AddMailModal/AddMailModal";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import {
    openTokenModal,
    setAddMailModal,
    setAlertModalMsg,
    setDeleteMailModal,
    setMailListModal,
    setRefreshProject
} from "../../redux/actions";
import {useDispatch, useSelector} from "react-redux";
import axios from "axios";
import {v4 as uuidv4} from "uuid";

function MailListTable(data) {
    const project_name = data["project_name"]
    const refreshEmail = useSelector(state => state.stateRedux.refreshEmail)
    const apiToken = useSelector(state => state.stateRedux.apiToken)
    const dispatch = useDispatch();

    const [selectedItems, setSelectedItems] = useState([]);
    const [mail_list,setMail_list] = useState([]);
    const [loading, setLoading] = useState(false);

    const {t} = useTranslation();

    const MAIL_COLUMN_DEFINITIONS = [
        {
            id: 'emaiList',
            header: t('EmailAddress'),
            cell: item => item.Endpoint,
            isRowHeader: true,
            width: "50%",
        },
        {
            id: 'state',
            header: t('SubscriptionState'),
            cell: item => {
                return item.SubscriptionArn.startsWith('arn:aws') ? (
                    <StatusIndicator type="success">{t("Confirmed")}</StatusIndicator>
                ) : (
                    <StatusIndicator type="pending">{item.SubscriptionArn}</StatusIndicator>
                );
            },
            width: "50%",
            isRowHeader: true,
        }
    ];

    useEffect(() => {
        if (apiToken) {
            console.log("MailListTable useEffect with apiToken")
            if(data.show){
                refreshData()
            }
        } else {
            dispatch(openTokenModal(true))
        }
    }, [refreshEmail,data.show]);

    const refreshData = () => {
        console.log("Refresh MailList Table")
        setLoading(true)
        setMail_list([])
        setSelectedItems([])
        axios.post(
            './api/getmailbyproject',
            {
                "ProjectName": project_name
            },
            {
                headers: {
                    authorization: apiToken
                }
            }
        ).then((response) => {
            // console.log("response", response['data']);
            console.log("response", response['data']);
            setMail_list(response['data']);
            // dispatch(setMailListModal({
            //     show: true,
            //     project_name: project_name,
            // }))
        }).catch(err => {
            console.log(err.response);
            dispatch(setAlertModalMsg({
                type: "error",
                visible: true,
                title: err.response.status + " - " + err.response.statusText,
                msg: err.response.data.message
            }))
        }).finally(() => {
            setLoading(false)
        });
    }

    const handleAddMailModal = () => {
        dispatch(setAddMailModal({
            show: true,
            project_name: project_name
        }))
    }

    const handleDeleteMailModal = () => {
        dispatch(setDeleteMailModal({
            show: true,
            item: selectedItems,
            project_name:project_name
        }))
    }

    const resendMail = () => {
        axios.post(
            './api/addemail',
            {
                ProjectName: `${data["project_name"]}`,
                Email: `${selectedItems[0].Endpoint}`,
            },
            {
                headers: {
                    authorization: apiToken
                }
            }
        ).then((response) => {
            refreshData()
            dispatch(setAlertModalMsg({
                type: "success",
                visible: true,
                title: selectedItems[0].Endpoint + " "+t('ResendMailSuccess'),
                msg: t('CheckYourMailBox')
            }))
        }).catch(err => {
            console.log(err.response);
            dispatch(setAlertModalMsg({
                type: "error",
                visible: true,
                title: err.response.status + " - " + err.response.statusText,
                msg: err.response.data.message
            }))
        });
    }

    return (
        <Table
            columnDefinitions={MAIL_COLUMN_DEFINITIONS}
            items={mail_list}
            loadingText={t('DataLoading')}
            loading={loading}
            selectionType="single"
            selectedItems={selectedItems}
            stickyHeader={true}
            resizableColumns={true}
            onSelectionChange={({detail}) => {
                setSelectedItems(detail.selectedItems)
                console.log(detail.selectedItems)
            }}
            header={
                <Header
                    actions={
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button iconName="refresh" onClick={refreshData}/>
                            {<Button variant="primary" onClick={handleAddMailModal}>
                                {t('AddEmail')}
                            </Button>}
                            <Button
                                onClick={resendMail}
                                disabled={!(selectedItems.length === 1 && selectedItems[0].SubscriptionArn === "PendingConfirmation")}>{t('ResendMail')}</Button>
                            {<Button
                                onClick={handleDeleteMailModal}
                                disabled={!(selectedItems.length === 1 && selectedItems[0].SubscriptionArn.startsWith('arn:aws'))}>{t('DeleteEmail')}</Button>}
                        </SpaceBetween>
                    }
                >
                    {t('Email')}
                </Header>
            }
            empty={
                <Box
                    margin={{vertical: "xs"}}
                    textAlign="center"
                    color="inherit"
                >
                    <SpaceBetween size="m">
                        <b>{t('NoData')}</b>
                    </SpaceBetween>
                </Box>
            }
        />
    );
}

function MailListModal() {
    const data = useSelector(state => state.stateRedux.openMailListModal)
    const dispatch = useDispatch();
    const handleClose = () => {
        dispatch(setRefreshProject(uuidv4()))
        dispatch(setMailListModal({
            show: false,
            project_name: null
        }))
    }
    const {t} = useTranslation();
    return (
        <>
            <Modal
                size={"large"}
                visible={data.show}
                onDismiss={handleClose}
                header={t('EmailsList')}
            >
                {(
                    <SpaceBetween size="m">
                        <MailListTable
                            show={data.show}
                            project_name={data["project_name"]}
                        />
                    </SpaceBetween>
                )}
            </Modal>
            <AddEmailModal/>
            <DeleteEmailModal/>
        </>
    );
}

export default MailListModal
