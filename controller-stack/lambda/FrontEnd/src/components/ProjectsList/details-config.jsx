// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React from 'react';
import {KeyValuePairs, Link, Popover} from '@cloudscape-design/components';
import {useTranslation} from "react-i18next";
import '../../locale/i18n';
import {useDispatch} from "react-redux";
import {setCertListModal, setMailListModal} from "../../redux/actions";
import StatusIndicator from "@cloudscape-design/components/status-indicator";


export function LOGS_COLUMN_DEFINITIONS() {
    const {t} = useTranslation()
    const dispatch = useDispatch();

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
            "Replace failed": "error",
            "Delete IAM failed": "error",
            "Succeeded": "success",
        }

    const handleMailListModal = (mail_list, project_name) => {
        dispatch(setMailListModal({
            show: true,
            mail_list: mail_list,
            project_name: project_name
        }))
    }

    const handleCertListModal = (certs_list, iam_path, project_name) => {
        dispatch(setCertListModal({
            show: true,
            certs_list: certs_list,
            iam_path: iam_path,
            project_name: project_name
        }))
    }


    return [
        {
            id: 'name',
            header: t("ProjectName"),
            cell: item => item.Name,
            isRowHeader: true,
            sortingField: "Name",
        },
        {
            id: 'domainnames',
            header: t("DomainNames"),
            cell: item => item.DomainName,
            sortingField: "DomainName",
        },
        {
            id: 'certlist',
            header: t("CertList"),
            cell: item => (
                <u>
                    <Link
                        onClick={() => handleCertListModal(item.CertListContent, item.IAM_Path, item.Name)}>
                        {item.CertListContent.length + " " + t('Cert')}
                    </Link>
                </u>

            ),
        },
        {
            id: 'IssueStatus',
            header: t("IssueStatus"),
            cell: (item) => {
                const issueStatus = JSON.parse(item.SuccessfullyIssued)
                const keyValuePairs = ( <KeyValuePairs
                    columns={2}
                    items={[
                        {label: "Status", value: issueStatus.Status},
                        {label: "Lambda Trigger Time", value: issueStatus.LambdaTriggerTime},
                        {label: "ReplaceMsg", value: (typeof issueStatus.ReplaceMsg === 'object'
                                ?
                                <pre style={{
                                    whiteSpace: 'pre-wrap',
                                    wordWrap: 'break-word'
                                }}>{JSON.stringify(issueStatus.ReplaceMsg, null, 1)}</pre>
                                : issueStatus.ReplaceMsg)},
                        {label: "Lambda Request ID", value: issueStatus.LambdaRequestID},
                    ]}
                />)
                if (issueStatus.Status in certStateList) {
                    return (
                        <Popover
                            position="right"
                            dismissButton={true}
                            size={"large"}
                            triggerType="text"
                            content={
                                keyValuePairs
                            }
                        >
                            <StatusIndicator type={certStateList[issueStatus.Status]}>
                                {issueStatus.Status}
                            </StatusIndicator>
                        </Popover>
                    )
                } else {
                    return (
                        <Popover
                            position="right"
                            dismissButton={true}
                            size={"large"}
                            triggerType="text"
                            content={
                                keyValuePairs
                            }
                        >
                            <StatusIndicator
                                type="error"
                            >Error</StatusIndicator>
                        </Popover>)
                }
            },
        },
        {
            id: 'update',
            header: t("UpdateTime"),
            cell: item => item.Update,
            sortingField: "Update",
        },
        {
            id: 'expire',
            header: t("ExpireTime"),
            cell: item => item.Expire,
            sortingField: "Expire",
        },
        {
            id: 's3path',
            header: 'S3 URI',
            cell: item => item.s3path,
        },
        {
            id: 'EmailList',
            header: t("EmailsList"),
            cell: item => (
                item.SNSTopic ? (<u>
                    <Link
                        onClick={() => handleMailListModal(item.EmailList, item.Name)}>
                        {item.EmailList.length + " " + t('Subscriptions')}
                    </Link>
                </u>) : (<>{t('NoneSubscriptions')}</>)

            ),
        },
        {
            id: 'stack_state',
            header: t("StackState"),
            cell: (item) => {
                if (item.Stack_state in stackStateList) {
                    return (<StatusIndicator
                        type={stackStateList[item.Stack_state]}>{item.Stack_state}</StatusIndicator>)
                } else {
                    return (<StatusIndicator
                        colorOverride="blue"
                        type="in-progress"
                    >{item.Stack_state}</StatusIndicator>)
                }
            },
            isRowHeader: true,
        },
    ]
}
