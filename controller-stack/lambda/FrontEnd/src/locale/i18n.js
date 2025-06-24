import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';

const resources = {
	'en-US': {
		translation: {
			"Add": "Add",
			"AddEmail": "Add Email Address",
			"Cancel": "Cancel",
			"CertID": "Certification ID",
			"CertList": "IAM SSL Certificates List",
			"CertName": "Certification Name",
			"Cert": "SSL Certificate",
			"Confirm": "Confirm",
			"Confirmed": "Confirmed",
			"Create": "Create",
			"CreateProject": "Create Project",
			"CheckYourMailBox":"Please Check Your Mail Box",
			"DataLoading": "Data Loading..",
			"Delete": "Delete",
			"DeleteCert": "Delete IAM Certificate",
			"DeleteEmail": "Delete Email Address",
			"DeleteNote": "To confirm deletion, enter the name of the name of deleted in the text input field. Yon can't undo this action.",
			"DeleteNotice": "Please note: Before deleting the project, make sure you have disassociated the certificates on CloudFront and manually deleted all certificates in the certificate list. Otherwise, the project cannot be deleted.",
			"DeleteNoticeTitle": "Delete Notice Title",
			"DeleteProject":"Delete Project",
			"DomainNames": "Domain Names (seperated by ,)",
			"Email": "Email",
			"EmailAddress": "Email Address",
			"EmailsList": "Emails List",
			"ExpireTime": "Expire Time(UTC+8)",
			"InputToken": "Input token",
			"IssueStatus":"Cert Issuance Status",
			"Language": "EN",
			"Manual": "User Manual",
			"Match": "match",
			"Matches": "matches",
			"Modify": "Modify",
			"ModifyProject": "Modify Project",
			"NoData": "No Data",
			"Preferences": "Preferences",
			"ProjectDetails": "Project Details",
			"ProjectID": "Project ID",
			"ProjectName": "Project Name",
			"ProjectsList": "Projects List",
			"PendingConfirmation": "Pending Confirmation",
			"Records": "records",
			"RenewInterval": "SSL Renew Interval Days (1~89, Recommend 30days)",
			"ReCert":"Reissue SSL",
			"ResendMail":"Resend Confirmation Mail",
			"ResendMailSuccess":"Confirmation was resent successfully.",
			"SelectPageSize": "Select page size",
			"SetToken": "Set Token",
			"SetTokenPlaceholder": "Please Input API Token",
			"Subscriptions": "Email Subscriptions",
			"NoneSubscriptions":"SNS topic does not exist",
			"SubscriptionState": "Subscription State",
			"StackState": "Stack Status",
			"Title": "China CloudFront SSL Plugin",
			"Update": "Update",
			"UpdateCert": "Update",
			"UpdateTime": "Update Time(UTC+8)",
			"UseLanguage": "Browse site in",
			"VisibleColumns": "Visible Columns",
		},
	},
	'zh-CN': {
		translation: {
			"Add": "添加",
			"AddEmail": "添加Email",
			"Cancel": "取消",
			"Cert": "个SSL证书",
			"CertID": "证书ID",
			"CertList": "证书列表",
			"CertName": "证书名称",
			"Confirm": "确认",
			"Confirmed": "已确认",
			"Create": "新建",
			"CreateProject": "新建项目",
			"CheckYourMailBox":"请检查您的邮箱",
			"DataLoading": "数据加载中..",
			"Delete": "删除",
			"DeleteCert": "删除证书",
			"DeleteNoticeTitle": "无法删除项目",
			"DeleteNotice":"请注意，删除项目前请确认已经解除关联在CloudFront上的证书，并在证书列表中手动删除所有证书，否则将无法删除项目。",
			"DeleteEmail": "删除Email",
			"DeleteNote": "要确认删除，请在文本输入字段中输入要删除的名称。此操作不可以回退。",
			"DeleteProject": "删除项目",
			"DomainNames": "域名(,分隔)",
			"Email": "Email",
			"EmailAddress": "Email地址",
			"EmailsList": "接收通知Email列表",
			"ExpireTime": "过期时间(UTC+8)",
			"InputToken": "输入密钥",
			"IssueStatus":"证书颁发状态",
			"Language": "ZH",
			"Manual": "用户手册",
			"Match": "个匹配",
			"Matches": "个匹配",
			"Modify": "修改",
			"ModifyProject": "修改项目",
			"NoData": "没有数据",
			"Preferences": "设置",
			"ProjectDetails": "项目详情",
			"ProjectID": "项目ID",
			"ProjectName": "项目名称",
			"ProjectsList": "项目列表",
			"PendingConfirmation": "等待确认",
			"Records": "条记录",
			"RenewInterval": "SSL证书更新时间间隔(天, 1~89天，推荐30天)",
			"ReCert":"重新颁发",
			"ResendMail":"重发确认邮件",
			"ResendMailSuccess":"邮件重发确认成功!",
			"SelectPageSize": "选择页面大小",
			"SetToken": "设置密钥",
			"SetTokenPlaceholder": "请输入API密钥",
			"Subscriptions": "个Email订阅",
			"SubscriptionState": "订阅状态",
			"NoneSubscriptions":"SNS主题不存在",
			"StackState": "堆栈状态",
			"Title": "China CloudFront SSL Plugin",
			"Update": "更新",
			"UpdateCert": "更新证书",
			"UpdateTime": "更新时间(UTC+8)",
			"UseLanguage": "使用以下语言",
			"VisibleColumns": "可见列",
		},
	},
};

// 获取浏览器语言
const getBrowserLanguage = () => {
  // 获取浏览器语言
  const browserLang = navigator.language || navigator.userLanguage;
  
  // 检查是否支持该语言
  if (browserLang.startsWith('zh')) {
    return 'zh-CN';
  } else {
    return 'en-US'; // 默认使用英语
  }
};

i18n.use(initReactI18next).init({
	resources,
	lng: getBrowserLanguage(), // 使用浏览器语言作为默认语言
	fallbackLng: 'en-US', // 如果检测到的语言不支持，则回退到英语
	interpolation: {
		escapeValue: false,
	},
});

export default i18n;