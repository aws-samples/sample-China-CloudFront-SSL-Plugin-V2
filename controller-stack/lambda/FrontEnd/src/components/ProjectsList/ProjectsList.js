import React, {useEffect, useState} from 'react';
import {useTranslation} from "react-i18next";
import {LOGS_COLUMN_DEFINITIONS} from "./details-config";
import axios from "axios";
import {
    Box,
    Button,
    CollectionPreferences,
    Header,
    Pagination,
    SpaceBetween,
    Table,
    TextFilter
} from "@cloudscape-design/components";
import {useCollection} from '@cloudscape-design/collection-hooks';
import CreateModal from "../CreateModal/CreateModal";
import {useDispatch, useSelector} from "react-redux";
import {openTokenModal, setAlertModalMsg, setCreateModal, setDeleteModal, setModifyModal} from "../../redux/actions";
import ModifyModal from "../ModifyModal/ModifyModal";
import DeleteProjectModal from "../DeleteProjectModal/DeleteProjectModal";
import CertlistModal from "../CertListModal/CertListModal";
import MailListModal from "../MailListModal/MailListModal";

// import testData from './data.json';



function ProjectsList() {
    const [selectedItems, setSelectedItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();
    const [tablePreferences, setTablePreferences] = useState({
        pageSize: 10,
        contentDisplay: [
            { id: 'name', visible: true },
            { id: 'domainnames', visible: true },
            { id: 'certlist', visible: true },
            { id: 'IssueStatus', visible: true },
            { id: 'update', visible: true },
            { id: 'expire', visible: true },
            { id: 's3path', visible: true },
            { id: 'EmailList', visible: true },
            { id: 'stack_state', visible: true }
        ]
    });

    const [projects_data, setProjectsData] = useState([]);
    const {t} = useTranslation();
    const column_definitions = LOGS_COLUMN_DEFINITIONS();

    const apiToken = useSelector(state => state.stateRedux.apiToken)
    const refreshProject = useSelector(state => state.stateRedux.refreshProject)

    const {items, filteredItemsCount, collectionProps, filterProps, paginationProps} = useCollection(
        projects_data,
        {
            filtering: {
                empty: "",
                noMatch: "",
            },
            pagination: {pageSize: tablePreferences.pageSize},
            sorting: {defaultState: {sortingColumn: column_definitions[0]}},
            selection: {},
        }
    );

    useEffect(() => {
        console.log("useEffect with apiToken")
        if (apiToken) {
            setLoading(true)
            refreshData()
        } else {
            dispatch(openTokenModal(true))
        }
    }, [refreshProject]);

    const refreshData = () => {
        setLoading(true)
        setSelectedItems([])
        setProjectsData([])
        axios.post(
            './api/dataprovider',
            {},
            {
                headers: {
                    authorization: apiToken
                }
            }
        ).then((response) => {
            // console.log("response", response['data']);
            console.log("response", response['data']);
            setProjectsData(response['data']);
        }).catch(err => {
            console.log(err.response);
            dispatch(setAlertModalMsg({
                type: "error",
                visible: true,
                title: err.response.status + " - " + err.response.statusText,
                msg: err.response.data.message
            }))
            if(err.response.status===403){
                dispatch(openTokenModal(true))
            }
        }).finally(() => {
            setLoading(false)
        });
        // Testing
        // setProjectsData(testData);
        // setLoading(false)
    }

    const handleCreateModal = () => {
        dispatch(setCreateModal(true))
    }

    const handleModifyModal = () => {
        dispatch(setModifyModal(true))
    };

    const handleDeleteModal = () => {
        dispatch(setDeleteModal(true))
    }

    const getMatchesCountText = (count) => {
        return count === 1 ? `1 ${t('Match')}` : `${count} ${t('Matches')}`;
    };

    return (
        <>
            <Table
                {...collectionProps}
                columnDefinitions={column_definitions}
                items={items}
                // ariaLabels={logsTableAriaLabels}
                stickyHeader={true}
                selectionType="single"
                selectedItems={selectedItems}
                resizableColumns={true}
                columnDisplay={tablePreferences.contentDisplay}
                onSelectionChange={({detail}) => {
                    setSelectedItems(detail.selectedItems)
                }}
                filter={
                    <TextFilter
                        {...filterProps}
                        countText={getMatchesCountText(filteredItemsCount)}
                        filteringAriaLabel="Filter instances"
                    />
                }
                pagination={
                    <Pagination
                        {...paginationProps}
                        disabled={paginationProps.pagesCount === 0}
                    />
                }
                preferences={<CollectionPreferences
                    title={t("Preferences")}
                    confirmLabel={t('Confirm')}
                    cancelLabel={t('Cancel')}
                    onConfirm={({detail}) => setTablePreferences(detail)}
                    preferences={tablePreferences}
                    pageSizePreference={{
                        title: t('SelectPageSize'),
                        options: [
                            {value: 10, label: `10 ${t('Records')}`},
                            {value: 20, label: `20 ${t('Records')}`},
                            {value: 30, label: `30 ${t('Records')}`},
                        ]
                    }}
                    contentDisplayPreference={{
                        title: t('VisibleColumns'),
                        options: [
                            { id: 'name', label: t('ProjectName'), alwaysVisible: true },
                            { id: 'domainnames', label: t('DomainNames'),alwaysVisible: true },
                            { id: 'certlist', label: t('CertList') },
                            { id: 'IssueStatus', label: t('IssueStatus') },
                            { id: 'update', label: t('UpdateTime') },
                            { id: 'expire', label: t('ExpireTime') },
                            { id: 's3path', label: 'S3 URI' },
                            { id: 'EmailList', label: t('EmailsList') },
                            { id: 'stack_state', label: t('StackState') },
                        ]
                    }}
                />}
                header={
                    <Header
                        counter={projects_data.length > 0 ? "(" + projects_data.length + ")" : ""}
                        actions={
                            <SpaceBetween direction="horizontal" size="xs">
                                <Button iconName="refresh" onClick={refreshData}/>
                                <Button variant="primary" onClick={handleCreateModal}>{t('CreateProject')}</Button>
                                {<Button variant="primary" onClick={handleModifyModal}
                                         disabled={!(selectedItems.length === 1)}>
                                    {t('ModifyProject')}
                                </Button>}
                                {<Button onClick={handleDeleteModal} disabled={!(selectedItems.length === 1)}>
                                    {t('DeleteProject')}
                                </Button>}
                            </SpaceBetween>
                        }
                    >
                        {t('ProjectsList')}
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
                            {<Button variant="primary" onClick={handleCreateModal}>{t('CreateProject')}</Button>}
                        </SpaceBetween>
                    </Box>
                }
                footer={<></>}
            />
            <CreateModal/>
            <ModifyModal selectedItems={selectedItems}/>
            <DeleteProjectModal selectedItems={selectedItems}/>
            <CertlistModal/>
            <MailListModal/>
        </>

    );

}

export default ProjectsList