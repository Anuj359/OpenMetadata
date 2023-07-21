/*
 *  Copyright 2023 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
import { Menu, Space, Typography } from 'antd';
import classNames from 'classnames';
import Loader from 'components/Loader/Loader';
import { TaskTab } from 'components/Task/TaskTab/TaskTab.component';
import { observerOptions } from 'constants/Mydata.constants';
import { EntityTabs, EntityType } from 'enums/entity.enum';
import { FeedFilter } from 'enums/mydata.enum';
import {
  Thread,
  ThreadTaskStatus,
  ThreadType,
} from 'generated/entity/feed/thread';
import { Paging } from 'generated/type/paging';
import { useElementInView } from 'hooks/useElementInView';
import { noop } from 'lodash';
import {
  default as React,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams } from 'react-router-dom';
import { getAllFeeds, getFeedCount } from 'rest/feedsAPI';
import { getCountBadge, getEntityDetailLink } from 'utils/CommonUtils';
import { ENTITY_LINK_SEPARATOR, getEntityFeedLink } from 'utils/EntityUtils';
import { getEntityField } from 'utils/FeedUtils';
import '../../Widgets/FeedsWidget/feeds-widget.less';
import ActivityFeedEditor from '../ActivityFeedEditor/ActivityFeedEditor';
import ActivityFeedListV1 from '../ActivityFeedList/ActivityFeedListV1.component';
import FeedPanelBodyV1 from '../ActivityFeedPanel/FeedPanelBodyV1';
import FeedPanelHeader from '../ActivityFeedPanel/FeedPanelHeader';
import { useActivityFeedProvider } from '../ActivityFeedProvider/ActivityFeedProvider';
import './activity-feed-tab.less';
import {
  ActivityFeedTabProps,
  ActivityFeedTabs,
  TaskFilter,
} from './ActivityFeedTab.interface';
import { ReactComponent as CheckIcon } from '/assets/svg/ic-check.svg';
import { ReactComponent as TaskIcon } from '/assets/svg/ic-task.svg';

import { ICON_DIMENSION } from 'constants/constants';
import { ReactComponent as AllActivityIcon } from '/assets/svg/all-activity-v2.svg';
import { ReactComponent as MentionIcon } from '/assets/svg/ic-mentions.svg';
import { ReactComponent as TaskListIcon } from '/assets/svg/task-ic.svg';

export const ActivityFeedTab = ({
  fqn,
  owner,
  columns,
  entityType,
  onUpdateEntityDetails,
}: ActivityFeedTabProps) => {
  const history = useHistory();
  const { t } = useTranslation();
  const [elementRef, isInView] = useElementInView(observerOptions);
  const { subTab: activeTab = 'all' } =
    useParams<{ subTab: ActivityFeedTabs }>();
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('open');
  const [allCount, setAllCount] = useState(0);
  const [tasksCount, setTasksCount] = useState(0);

  const {
    postFeed,
    selectedThread,
    setActiveThread,
    entityThread,
    getFeedData,
    loading,
    userId,
    entityPaging,
  } = useActivityFeedProvider();

  const isUserEntity = useMemo(
    () => entityType === EntityType.USER_NAME,
    [entityType]
  );

  const entityTypeTask = useMemo(
    () =>
      selectedThread?.about?.split(ENTITY_LINK_SEPARATOR)?.[1] as Exclude<
        EntityType,
        EntityType.TABLE
      >,
    [selectedThread]
  );

  const handleTabChange = (subTab: string) => {
    history.push(
      getEntityDetailLink(entityType, fqn, EntityTabs.ACTIVITY_FEED, subTab)
    );
    setActiveThread();
  };

  const placeholderText = useMemo(() => {
    if (activeTab === ActivityFeedTabs.ALL) {
      return t('message.no-activity-feed');
    } else if (activeTab === ActivityFeedTabs.MENTIONS) {
      return t('message.no-mentions');
    } else {
      return t('message.no-tasks-assigned');
    }
  }, [activeTab]);

  const fetchFeedsCount = () => {
    if (!isUserEntity) {
      // To get conversation count
      getFeedCount(
        getEntityFeedLink(entityType, fqn),
        ThreadType.Conversation
      ).then((res) => {
        if (res) {
          setAllCount(res.totalCount);
        } else {
          throw t('server.entity-feed-fetch-error');
        }
      });

      // To get open tasks count
      getFeedCount(getEntityFeedLink(entityType, fqn), ThreadType.Task).then(
        (res) => {
          if (res) {
            setTasksCount(res.totalCount);
          } else {
            throw t('server.entity-feed-fetch-error');
          }
        }
      );
    } else {
      // count for task on userProfile page
      getAllFeeds(
        undefined,
        undefined,
        ThreadType.Task,
        FeedFilter.OWNER,
        undefined,
        userId
      ).then((res) => {
        if (res) {
          setTasksCount(res.paging.total);
        } else {
          throw t('server.entity-feed-fetch-error');
        }
      });

      // count for all on userProfile page
      getAllFeeds(
        undefined,
        undefined,
        ThreadType.Conversation,
        FeedFilter.OWNER,
        undefined,
        userId
      ).then((res) => {
        if (res) {
          setAllCount(res.paging.total);
        } else {
          throw t('server.entity-feed-fetch-error');
        }
      });
    }
  };

  useEffect(() => {
    if (fqn) {
      fetchFeedsCount();
    }
  }, [fqn]);

  const { feedFilter, threadType } = useMemo(() => {
    return {
      threadType:
        activeTab === 'tasks' ? ThreadType.Task : ThreadType.Conversation,
      feedFilter:
        activeTab === 'mentions'
          ? FeedFilter.MENTIONS
          : EntityType.USER_NAME === entityType
          ? FeedFilter.OWNER
          : undefined,
    };
  }, [activeTab]);

  const handleFeedFetchFromFeedList = useCallback(
    (after?: string) => {
      getFeedData(feedFilter, after, threadType, entityType, fqn);
    },
    [threadType, feedFilter, entityType, fqn]
  );

  useEffect(() => {
    if (fqn) {
      getFeedData(feedFilter, undefined, threadType, entityType, fqn);
    }
  }, [feedFilter, threadType, fqn]);

  const handleFeedClick = useCallback(
    (feed: Thread) => {
      setActiveThread(feed);
    },
    [setActiveThread]
  );

  const fetchMoreThread = (
    isElementInView: boolean,
    pagingObj: Paging,
    isLoading: boolean
  ) => {
    if (isElementInView && pagingObj?.after && !isLoading) {
      handleFeedFetchFromFeedList(pagingObj.after);
    }
  };

  useEffect(() => {
    if (fqn) {
      fetchMoreThread(isInView, entityPaging, loading);
    }
  }, [entityPaging, loading, isInView, fqn]);

  const loader = useMemo(() => (loading ? <Loader /> : null), [loading]);

  const onSave = (message: string) => {
    postFeed(message, selectedThread?.id ?? '').catch(() => {
      // ignore since error is displayed in toast in the parent promise.
      // Added block for sonar code smell
    });
  };

  const entityField = selectedThread
    ? getEntityField(selectedThread.about)
    : '';

  const threads = useMemo(() => {
    if (activeTab === ActivityFeedTabs.TASKS) {
      return entityThread.filter(
        (thread) =>
          taskFilter === 'open'
            ? thread.task?.status === ThreadTaskStatus.Open
            : thread.task?.status === ThreadTaskStatus.Closed,
        []
      );
    }

    return entityThread;
  }, [activeTab, entityThread, taskFilter]);

  const [openTasks, closedTasks] = useMemo(() => {
    if (activeTab === ActivityFeedTabs.TASKS) {
      return entityThread.reduce(
        (acc, curr) => {
          if (curr.task?.status === ThreadTaskStatus.Open) {
            acc[0] = acc[0] + 1;
          } else {
            acc[1] = acc[1] + 1;
          }

          return acc;
        },
        [0, 0]
      );
    }

    return [0, 0];
  }, [entityThread, activeTab]);

  const handleUpdateTaskFilter = (filter: TaskFilter) => {
    setTaskFilter(filter);
  };

  return (
    <div className="activity-feed-tab">
      <Menu
        className="custom-menu p-t-sm"
        data-testid="global-setting-left-panel"
        items={[
          {
            label: (
              <div className="d-flex justify-between">
                <Space align="center" size="small">
                  <AllActivityIcon {...ICON_DIMENSION} />
                  <span>{t('label.all')}</span>
                </Space>

                <span>
                  {getCountBadge(
                    allCount,
                    '',
                    activeTab === ActivityFeedTabs.ALL
                  )}
                </span>
              </div>
            ),
            key: 'all',
          },
          {
            label: (
              <Space align="center" size="small">
                <MentionIcon {...ICON_DIMENSION} />
                <span>{t('label.mention-plural')}</span>
              </Space>
            ),
            key: 'mentions',
          },
          {
            label: (
              <div className="d-flex justify-between">
                <Space align="center" size="small">
                  <TaskListIcon {...ICON_DIMENSION} />
                  <span>{t('label.task-plural')}</span>
                </Space>
                <span>
                  {getCountBadge(
                    tasksCount,
                    '',
                    activeTab === ActivityFeedTabs.TASKS
                  )}
                </span>
              </div>
            ),
            key: 'tasks',
          },
        ]}
        mode="inline"
        rootClassName="left-container"
        selectedKeys={[activeTab]}
        onClick={(info) => handleTabChange(info.key)}
      />

      <div className=" center-container">
        {activeTab === ActivityFeedTabs.TASKS && (
          <div className="d-flex gap-4 p-sm p-x-lg activity-feed-task">
            <Typography.Text
              className={classNames(
                'cursor-pointer p-l-xss d-flex items-center',
                {
                  'font-medium': taskFilter === 'open',
                }
              )}
              onClick={() => {
                handleUpdateTaskFilter('open');
                setActiveThread();
              }}>
              {' '}
              <TaskIcon className="m-r-xss" width={14} /> {openTasks}{' '}
              {t('label.open')}
            </Typography.Text>
            <Typography.Text
              className={classNames('cursor-pointer d-flex items-center', {
                'font-medium': taskFilter === 'close',
              })}
              onClick={() => {
                handleUpdateTaskFilter('close');
                setActiveThread();
              }}>
              {' '}
              <CheckIcon className="m-r-xss" width={14} /> {closedTasks}{' '}
              {t('label.close')}
            </Typography.Text>
          </div>
        )}
        <ActivityFeedListV1
          hidePopover
          isForFeedTab
          activeFeedId={selectedThread?.id}
          emptyPlaceholderText={placeholderText}
          feedList={threads}
          isLoading={false}
          showThread={false}
          onFeedClick={handleFeedClick}
        />
        {loader}
        <div
          className="w-full"
          data-testid="observer-element"
          id="observer-element"
          ref={elementRef as RefObject<HTMLDivElement>}
          style={{ height: '2px' }}
        />
      </div>
      <div className=" right-container">
        {loader}
        {selectedThread &&
          !loading &&
          (activeTab !== ActivityFeedTabs.TASKS ? (
            <div id="feed-panel">
              <div className="feed-explore-heading">
                <FeedPanelHeader
                  hideCloseIcon
                  className="p-x-md"
                  entityFQN={fqn}
                  entityField={entityField as string}
                  threadType={selectedThread?.type ?? ThreadType.Conversation}
                  onCancel={noop}
                />
              </div>
              <FeedPanelBodyV1
                isForFeedTab
                isOpenInDrawer
                showThread
                feed={selectedThread}
                hidePopover={false}
              />
              <ActivityFeedEditor className="m-md" onSave={onSave} />
            </div>
          ) : (
            <div id="task-panel">
              {entityType === EntityType.TABLE ? (
                <TaskTab
                  columns={columns}
                  entityType={EntityType.TABLE}
                  owner={owner}
                  taskThread={selectedThread}
                  onTaskFeedFetch={handleFeedFetchFromFeedList}
                  onUpdateEntityDetails={onUpdateEntityDetails}
                  onUpdateTaskFilter={handleUpdateTaskFilter}
                />
              ) : (
                <TaskTab
                  entityType={isUserEntity ? entityTypeTask : entityType}
                  owner={owner}
                  taskThread={selectedThread}
                  onTaskFeedFetch={handleFeedFetchFromFeedList}
                  onUpdateEntityDetails={onUpdateEntityDetails}
                  onUpdateTaskFilter={handleUpdateTaskFilter}
                />
              )}
            </div>
          ))}
      </div>
    </div>
  );
};
