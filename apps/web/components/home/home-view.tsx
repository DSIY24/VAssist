"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeIcon } from "lucide-react";
import {
    defaultAgentAvatarUrl,
    defaultAgentName,
    resolveAgentName,
    widgetSettingsFormSchema,
    type Source,
    type UpdateWidgetSettingsInput,
    type WidgetSettings,
    type WidgetSettingsForm,
} from "@vassist/shared";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { hardNavigate } from "@/lib/navigation";
import { orpc } from "@/lib/orpc/client";
import { AllowedDomainsField } from "./allowed-domains-field";
import { HomeSection, SaveIndicator, errorCode } from "./home-parts";
import { HomeSkeleton } from "./home-skeleton";
import { InstallSection } from "./install-section";
import { KnowledgeSection } from "./knowledge-section";
import { SetupChecklist, type SetupStep } from "./setup-checklist";
import { useAutosave } from "./use-autosave";
import { WidgetPreview, type WidgetPreviewValues } from "./widget-preview";
import { WidgetSettingsFields } from "./widget-settings-fields";

/** How long a text field waits after the last keystroke before it saves. */
const SAVE_DELAY = 800;

type TextField = "agentName" | "greeting";
type FormField = keyof WidgetSettingsForm;

function HomeContent({
    settings,
    sources,
    sourcesLoading,
    sourcesFailed,
    onRetrySources,
}: {
    settings: WidgetSettings;
    sources: readonly Source[];
    sourcesLoading: boolean;
    sourcesFailed: boolean;
    onRetrySources: () => void;
}) {
    const queryClient = useQueryClient();
    const update = useMutation(
        orpc.widget.updateSettings.mutationOptions({
            onSuccess: (saved) => {
                queryClient.setQueryData(
                    orpc.widget.getSettings.queryKey(),
                    saved,
                );
            },
            onError: (error) => {
                if (errorCode(error) === "UNAUTHORIZED") hardNavigate("/login");
            },
        }),
    );
    const {
        status: saveStatus,
        queue: queueSave,
        retry: retrySave,
    } = useAutosave<UpdateWidgetSettingsInput>(update.mutateAsync);

    // The form starts from the saved settings and is never reset from the
    // server afterwards, so a save that lands while the owner is typing can't
    // overwrite the field under them.
    const form = useForm<WidgetSettingsForm>({
        resolver: zodResolver(widgetSettingsFormSchema),
        mode: "onChange",
        defaultValues: {
            agentName: settings.agentName ?? "",
            greeting: settings.greeting,
            color: settings.color,
            position: settings.position,
        },
    });
    const values = useWatch({ control: form.control });
    const [domains, setDomains] = React.useState(settings.allowedDomains);

    // What was last sent for each field, so an unchanged field isn't saved
    // again on blur.
    const sent = React.useRef<WidgetSettingsForm>({
        agentName: settings.agentName ?? "",
        greeting: settings.greeting,
        color: settings.color,
        position: settings.position,
    });
    const timers = React.useRef<Partial<Record<TextField, number>>>({});

    const saveField = React.useCallback(
        async (name: FormField) => {
            window.clearTimeout(timers.current[name as TextField]);
            delete timers.current[name as TextField];
            // An invalid field shows its error and is not saved.
            if (!(await form.trigger(name))) return;
            const parsed = widgetSettingsFormSchema.shape[name].safeParse(
                form.getValues(name),
            );
            if (!parsed.success || parsed.data === sent.current[name]) return;
            sent.current = { ...sent.current, [name]: parsed.data };
            queueSave({ [name]: parsed.data });
        },
        [queueSave, form],
    );

    function scheduleSave(name: TextField) {
        window.clearTimeout(timers.current[name]);
        timers.current[name] = window.setTimeout(
            () => void saveField(name),
            SAVE_DELAY,
        );
    }

    // Leaving the page with a save still waiting on its delay sends it now.
    React.useEffect(() => {
        const waiting = timers.current;
        return () => {
            for (const name of Object.keys(waiting) as TextField[]) {
                void saveField(name);
            }
        };
    }, [saveField]);

    const preview: WidgetPreviewValues = {
        color: values.color ?? settings.color,
        position: values.position ?? settings.position,
        agentName: resolveAgentName(values.agentName, settings.workspaceName),
        agentAvatarUrl:
            settings.agentAvatarUrl ??
            defaultAgentAvatarUrl(settings.workspaceId),
        // An emptied greeting can't be saved, so the preview keeps the last
        // saved one rather than an empty bubble.
        greeting: values.greeting?.trim() || settings.greeting,
        suggestedQuestions: settings.suggestedQuestions,
    };

    const steps: SetupStep[] = [
        {
            title: "Add a source",
            description:
                "Upload a file or write text for your agent to answer from.",
            href: "#knowledge-base",
            done: sources.length > 0,
        },
        {
            title: "Add an allowed domain",
            description: "Say which website the widget may load on.",
            href: "#allowed-domains",
            done: domains.length > 0,
        },
        {
            title: "Install the snippet",
            description:
                "Paste one line into your website. This is done once the widget has loaded there.",
            href: "#install",
            done: settings.snippetInstalled,
        },
    ];

    return (
        <div className="flex flex-1 flex-col lg:flex-row">
            <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 lg:p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <p className="text-lg font-medium">
                            {settings.workspaceName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Set up your widget and what your agent knows.
                        </p>
                    </div>
                    <Sheet>
                        <SheetTrigger
                            render={
                                <Button
                                    variant="outline"
                                    className="lg:hidden"
                                />
                            }
                        >
                            <EyeIcon data-icon="inline-start" />
                            Preview
                        </SheetTrigger>
                        <SheetContent
                            side="right"
                            className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"
                        >
                            <SheetHeader>
                                <SheetTitle>Widget preview</SheetTitle>
                                <SheetDescription>
                                    How the widget looks with your current
                                    settings.
                                </SheetDescription>
                            </SheetHeader>
                            <WidgetPreview
                                values={preview}
                                agentOn={settings.agentOn}
                                title="Show with"
                                className="min-h-0 flex-1 px-4 pb-4"
                            />
                        </SheetContent>
                    </Sheet>
                </div>

                <SetupChecklist steps={steps} />

                <HomeSection
                    id="widget-settings"
                    title="Widget"
                    description="How the widget looks and where it may load. Changes save automatically."
                    action={
                        <SaveIndicator
                            status={saveStatus}
                            onRetry={() => void retrySave()}
                        />
                    }
                >
                    <div className="flex flex-col gap-5">
                        <WidgetSettingsFields
                            form={form}
                            defaultAgentName={defaultAgentName(
                                settings.workspaceName,
                            )}
                            onTextChange={scheduleSave}
                            onTextBlur={(name) => void saveField(name)}
                            onChoice={(name) => void saveField(name)}
                        />
                        <div id="allowed-domains" className="scroll-mt-4">
                            <AllowedDomainsField
                                domains={domains}
                                onChange={(next) => {
                                    setDomains(next);
                                    queueSave({ allowedDomains: next });
                                }}
                            />
                        </div>
                    </div>
                </HomeSection>

                <KnowledgeSection
                    sources={sources}
                    loading={sourcesLoading}
                    failed={sourcesFailed}
                    onRetry={onRetrySources}
                />

                <InstallSection workspaceId={settings.workspaceId} />
            </div>

            <aside
                aria-label="Widget preview"
                className="hidden w-[38%] max-w-md shrink-0 border-l lg:block"
            >
                <WidgetPreview
                    values={preview}
                    agentOn={settings.agentOn}
                    className="sticky top-0 h-[min(46rem,100svh)] p-6"
                />
            </aside>
        </div>
    );
}

/** The Home page: set up the widget and the knowledge base (PRD 7.4). */
export function HomeView() {
    const settings = useQuery(orpc.widget.getSettings.queryOptions());
    const sources = useQuery(orpc.knowledge.listSources.queryOptions());

    if (settings.isPending) return <HomeSkeleton />;
    if (settings.isError) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                <p role="alert" className="text-sm text-destructive">
                    Couldn&apos;t load your settings.
                </p>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => void settings.refetch()}
                >
                    Try again
                </Button>
            </div>
        );
    }
    return (
        <HomeContent
            settings={settings.data}
            sources={sources.data ?? []}
            sourcesLoading={sources.isPending}
            sourcesFailed={sources.isError}
            onRetrySources={() => void sources.refetch()}
        />
    );
}
