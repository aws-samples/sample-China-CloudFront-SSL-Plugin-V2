import React, {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {Box, Button, Header, Modal, SpaceBetween, Table} from "@cloudscape-design/components";
import axios from "axios";
import {
    openTokenModal,
    setAlertModalMsg,
    setCertListModal,
    setDeleteCertModal,
    setRecertModal,
    setRefreshProject
} from "../../redux/actions";
import {useDispatch, useSelector} from "react-redux";
import DeleteCertModal from "../DeleteCertModal/DeleteCertModal";
import {v4 as uuidv4} from "uuid";
import ReCertModal from "../ReCertModal/ReCertModal";

function CertlistTable(data) {
    const iam_path = data["iam_path"];
    const project_name = data["project_name"];
    const refreshCert = useSelector(state => state.stateRedux.refreshCert)
    const apiToken = useSelector(state => state.stateRedux.apiToken)
    const dispatch = useDispatch();

    const [selectedItems, setSelectedItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [cert_data,setCert_data] = React.useState([]);

    const {t} = useTranslation();

    const CERT_COLUMN_DEFINITIONS = [
        {
            id: 'certname',
            header: t('CertName'),
            cell: item => item.ServerCertificateName,
            isRowHeader: true,
            width: "30%"
        },
        {
            id: 'certID',
            header: t('CertID'),
            cell: item => item.ServerCertificateId,
            width: "30%"
        },
        {
            id: 'updateTime',
            header: t('UpdateTime'),
            cell: item => item.UploadDate,
            width: "20%"
        },
        {
            id: 'expireTime',
            header: t('ExpireTime'),
            cell: item => item.Expiration,
            width: "20%"
        },
    ];

    useEffect(() => {
        if (apiToken) {
            console.log("CertlistTable useEffect with apiToken")
            if(data.show){
                refreshData()
            }
        } else {
            dispatch(openTokenModal(true))
        }
    }, [refreshCert,data.show]);

    const refreshData = () => {
        console.log("Refresh CertList Table")
        setCert_data([])
        setLoading(true)
        setSelectedItems([])
        axios.post(
            './api/getcertbypath',
            {
                "IAM_Path": iam_path
            },
            {
                headers: {
                    authorization: apiToken
                }
            }
        ).then((response) => {
            console.log("response", response['data']);
            setCert_data(response['data']);
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

    const handleDeleteCertModal = () => {
        dispatch(setDeleteCertModal({
            show: true,
            item: selectedItems
        }))
    }

    const handleReCertModal = () => {
        dispatch(setRecertModal({
            show: true,
            project_name: project_name
        }))
    }

    return (
        <Table
            columnDefinitions={CERT_COLUMN_DEFINITIONS}
            items={cert_data}
            selectionType="single"
            selectedItems={selectedItems}
            stickyHeader={true}
            resizableColumns={true}
            onSelectionChange={({detail}) => {
                setSelectedItems(detail.selectedItems)
            }}
            header={
                <Header
                    actions={
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button iconName="refresh" onClick={refreshData}/>
                            {<Button variant="primary" onClick={handleReCertModal}>
                                {t('ReCert')}
                            </Button>}
                            {<Button disabled={!(selectedItems.length === 1)}
                                     onClick={handleDeleteCertModal}>{t('DeleteCert')}</Button>}
                        </SpaceBetween>
                    }
                >
                    {t('IAM Cert')}
                </Header>
            }
            loading={loading}
            loadingText={t('DataLoading')}
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


function CertlistModal() {
    const data = useSelector(state => state.stateRedux.openCertListModal)
    console.log("CertlistModal")
    const dispatch = useDispatch();
    const handleClose = () => {
        dispatch(setRefreshProject(uuidv4()))
        dispatch(setCertListModal({
            show: false,
            certs_list: null,
            iam_path: null,
            project_name: null,
        }))
    }
    const {t} = useTranslation();

    return (
        <>
            <Modal
                size={"max"}
                visible={data.show}
                onDismiss={handleClose}
                header={t('CertList')}
            >
                {(
                    <SpaceBetween size="m">
                        <CertlistTable
                            show={data.show}
                            iam_path={data["iam_path"]}
                            project_name={data["project_name"]}
                        />
                    </SpaceBetween>
                )}
            </Modal>
            <DeleteCertModal/>
            <ReCertModal/>
        </>

    );
}

export default CertlistModal
